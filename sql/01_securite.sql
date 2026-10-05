-- =====================================================================
--  NANCE GROUP — Sécurisation de la base (à exécuter UNE SEULE FOIS)
--  Supabase → SQL Editor → New query → coller tout ce fichier → Run
--
--  Ce script :
--   1. crée un vrai compte de connexion chiffré (Supabase Auth) pour chaque
--      compte existant, AVEC SON MOT DE PASSE ACTUEL (personne n'est bloqué) ;
--   2. chiffre les codes PIN ;
--   3. supprime les mots de passe en clair de la table "comptes" ;
--   4. ferme la base à toute personne non connectée (règles RLS).
--
--  Tout se fait dans une seule transaction : en cas d'erreur, RIEN n'est modifié.
--  ATTENTION : dès qu'il a tourné, l'ANCIENNE version du site ne peut plus se
--  connecter. Mettre en ligne la nouvelle version juste après.
-- =====================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Nouvelles colonnes sur "comptes"
-- ---------------------------------------------------------------------
alter table public.comptes add column if not exists auth_id uuid unique references auth.users(id) on delete set null;
alter table public.comptes add column if not exists session_version integer not null default 0;

-- ---------------------------------------------------------------------
-- 2. Table secrète des codes PIN (hachés, illisibles depuis l'application)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t
    from pg_attribute where attrelid = 'public.comptes'::regclass and attname = 'id';
  execute format('create table if not exists public.comptes_secrets (
      compte_id %s primary key references public.comptes(id) on delete cascade,
      pin_hash  text)', t);
end $$;

-- ---------------------------------------------------------------------
-- 3. Migration des comptes existants vers Supabase Auth
-- ---------------------------------------------------------------------
do $$
declare
  c        record;
  v_email  text;
  v_uid    uuid;
  v_ok     int := 0;
  v_rates  text := '';
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'comptes' and column_name = 'mot_de_passe') then
    raise notice 'Mots de passe en clair déjà supprimés : migration déjà faite, étape ignorée.';
    return;
  end if;

  for c in execute 'select id, identifiant, mot_de_passe, pin_code from public.comptes where auth_id is null' loop
    if position('@' in coalesce(c.identifiant, '')) > 0 then
      v_email := lower(trim(c.identifiant));
    else
      v_email := regexp_replace(lower(trim(coalesce(c.identifiant, ''))), '[^a-z0-9._-]', '', 'g') || '@nancegroup.app';
    end if;

    if v_email like '@%' or coalesce(c.mot_de_passe, '') = '' then
      v_rates := v_rates || ' [' || coalesce(c.identifiant, '?') || ' : identifiant ou mot de passe vide]';
      continue;
    end if;

    select id into v_uid from auth.users where email = v_email;

    if v_uid is not null and exists (select 1 from public.comptes where auth_id = v_uid) then
      v_rates := v_rates || ' [' || c.identifiant || ' : identifiant en double avec un autre compte]';
      continue;
    end if;

    if v_uid is null then
      v_uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
        extensions.crypt(c.mot_de_passe, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('identifiant', c.identifiant),
        now(), now(), '', '', '', '');

      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_uid, v_uid::text,
              jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
              'email', now(), now(), now());
    end if;

    update public.comptes set auth_id = v_uid where id = c.id;

    if coalesce(c.pin_code, '') ~ '^\d{4}$' then
      insert into public.comptes_secrets (compte_id, pin_hash)
      values (c.id, extensions.crypt(c.pin_code, extensions.gen_salt('bf')))
      on conflict (compte_id) do update set pin_hash = excluded.pin_hash;
    end if;

    v_ok := v_ok + 1;
  end loop;

  if v_rates <> '' then
    raise exception 'Migration ANNULÉE (rien n''a été modifié). Comptes à corriger :%', v_rates;
  end if;

  raise notice '% compte(s) migré(s) vers la connexion sécurisée.', v_ok;

  -- Plus aucun mot de passe ni PIN en clair dans la base
  alter table public.comptes drop column if exists mot_de_passe;
  alter table public.comptes drop column if exists pin_code;
end $$;

-- ---------------------------------------------------------------------
-- 4. Fonctions de contrôle d'accès
-- ---------------------------------------------------------------------
create or replace function public.est_connecte() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.comptes where auth_id = auth.uid());
$$;

create or replace function public.est_pdg() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.comptes where auth_id = auth.uid() and role = 'pdg');
$$;

create or replace function public.j_ai_un_pin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.comptes_secrets s join public.comptes c on c.id = s.compte_id
                 where c.auth_id = auth.uid() and s.pin_hash is not null);
$$;

create or replace function public.verifier_mon_pin(p_pin text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
                   from public.comptes_secrets s join public.comptes c on c.id = s.compte_id
                   where c.auth_id = auth.uid() and s.pin_hash is not null), false);
$$;

-- Définir (4 chiffres) ou retirer (null / vide) le PIN d'un compte : le PDG, ou la personne elle-même
create or replace function public.definir_pin(p_compte text, p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.est_pdg() or exists (select 1 from public.comptes where id::text = p_compte and auth_id = auth.uid())) then
    raise exception 'Non autorisé';
  end if;
  if p_pin is null or p_pin = '' then
    delete from public.comptes_secrets where compte_id::text = p_compte;
  else
    if p_pin !~ '^\d{4}$' then raise exception 'Le PIN doit contenir exactement 4 chiffres'; end if;
    insert into public.comptes_secrets (compte_id, pin_hash)
    select c.id, extensions.crypt(p_pin, extensions.gen_salt('bf')) from public.comptes c where c.id::text = p_compte
    on conflict (compte_id) do update set pin_hash = excluded.pin_hash;
  end if;
  update public.comptes set session_version = session_version + 1 where id::text = p_compte;
end $$;

-- Liste des comptes ayant un PIN (pour l'écran "Comptes" du PDG)
create or replace function public.comptes_avec_pin() returns table (compte_id text)
language sql stable security definer set search_path = '' as $$
  select s.compte_id::text from public.comptes_secrets s
  where public.est_pdg() and s.pin_hash is not null;
$$;

revoke all on function public.est_connecte(), public.est_pdg(), public.j_ai_un_pin(),
  public.verifier_mon_pin(text), public.definir_pin(text, text), public.comptes_avec_pin() from public, anon;
grant execute on function public.est_connecte(), public.est_pdg(), public.j_ai_un_pin(),
  public.verifier_mon_pin(text), public.definir_pin(text, text), public.comptes_avec_pin() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Un responsable / superviseur ne peut pas changer son rôle, sa boutique ou son identifiant
-- ---------------------------------------------------------------------
create or replace function public.proteger_comptes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.est_pdg() then
    if new.role is distinct from old.role
       or new.boutique_id is distinct from old.boutique_id
       or new.identifiant is distinct from old.identifiant
       or new.auth_id is distinct from old.auth_id
       or new.session_version is distinct from old.session_version then
      raise exception 'Modification non autorisée';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists proteger_comptes on public.comptes;
create trigger proteger_comptes before update on public.comptes
  for each row execute function public.proteger_comptes();

-- ---------------------------------------------------------------------
-- 6. Règles RLS : plus rien n'est lisible sans être connecté
-- ---------------------------------------------------------------------
do $$
declare t record; p record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;
    if t.tablename not in ('comptes', 'comptes_secrets') then
      execute format('create policy nance_connectes on public.%I for all to authenticated
                      using ((select public.est_connecte())) with check ((select public.est_connecte()))', t.tablename);
    end if;
  end loop;
end $$;

-- "comptes" : lecture pour les connectés ; modification de son propre profil ou par le PDG.
-- La création se fait uniquement par le serveur (api/comptes.js).
create policy comptes_lecture on public.comptes for select to authenticated
  using ((select public.est_connecte()));
create policy comptes_modification on public.comptes for update to authenticated
  using (auth_id = auth.uid() or (select public.est_pdg()))
  with check (auth_id = auth.uid() or (select public.est_pdg()));
create policy comptes_suppression on public.comptes for delete to authenticated
  using ((select public.est_pdg()));
-- "comptes_secrets" : aucune règle = inaccessible depuis l'application (seulement via les fonctions)

-- Ceinture + bretelles : le rôle anonyme n'a plus aucun droit sur les tables
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- 7. Photos (stockage) : envoi réservé aux connectés
-- ---------------------------------------------------------------------
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
  create policy nance_photos_lecture on storage.objects for select using (bucket_id = 'photos');
  create policy nance_photos_ajout on storage.objects for insert to authenticated
    with check (bucket_id = 'photos' and (select public.est_connecte()));
  create policy nance_photos_maj on storage.objects for update to authenticated
    using (bucket_id = 'photos' and (select public.est_connecte()));
  create policy nance_photos_suppression on storage.objects for delete to authenticated
    using (bucket_id = 'photos' and (select public.est_connecte()));
exception when others then
  raise notice 'Photos : règles de stockage non modifiées (%). Sans gravité.', sqlerrm;
end $$;

commit;

-- ---------------------------------------------------------------------
-- Vérification : chaque compte doit avoir "oui" dans la colonne connexion_securisee
-- ---------------------------------------------------------------------
select c.identifiant, c.role, (c.auth_id is not null) as connexion_securisee,
       exists (select 1 from public.comptes_secrets s where s.compte_id = c.id) as pin_actif
from public.comptes c order by c.role, c.identifiant;
