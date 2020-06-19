CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

alter table contact drop constraint if exists fk_contact_address;
drop table if exists address;
alter table users drop constraint if exists fk_user_contact;
drop table if exists org_user;
drop table if exists invite;
drop table if exists friend;
drop table if exists message;
drop table if exists tag;
drop table if exists groups;
drop table if exists contact;
drop table if exists org;
drop table if exists users;
drop type if exists user_role;
drop type if exists relation;
drop type if exists gender;
drop type if exists contact_method;
drop type if exists request_status;

CREATE TYPE user_role AS ENUM ('admin', 'superuser', 'editor', 'viewer', 'none');
CREATE TYPE relation AS ENUM ('parent', 'child', 'adpoted', 'spouse', 'closefriend', 'ex', 'sibling', 'manager', 'worker', 'peer');
CREATE TYPE gender AS ENUM ('male', 'female');
CREATE TYPE contact_method AS ENUM ('email', 'sms', 'other');
CREATE TYPE request_status AS ENUM ('request', 'confirmed', 'denied', 'expired');

create table users (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  username varchar(64) not null unique,
  password varchar(256) not null,
  contact_id bigint,
  work_contact_id bigint,
  token varchar(512),
  token_expiry timestamp,
  refresh_token varchar(512),
  preferences jsonb,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table friend (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  friend1 bigint not null REFERENCES users(id),
  friend2 bigint not null REFERENCES users(id),
  status request_status not null DEFAULT 'request',
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table message (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  from_id bigint not null REFERENCES users(id),
  to_id bigint not null REFERENCES users(id),
  message text,
  status request_status not null DEFAULT 'request',
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table org (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  created_by bigint not null REFERENCES users(id),
  name varchar(256) not null unique,
  code char(3) unique,
  domain varchar(64),
  email_domain varchar(64),
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table org_user (
  org_id bigint REFERENCES org(id),
  user_id bigint REFERENCES users(id),
  user_role user_role not null default 'viewer',
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table contact (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  created_by bigint not null REFERENCES users(id),
  external_id varchar(64),
  name varchar(256) not null,
  preferred_name varchar(256),
  email varchar(256),
  mobile varchar(16),
  date_birth date,
  date_wedding date,
  date_death date,
  address_id bigint,
  gender gender,
  notes text,
  groups int[],
  favourite boolean not null default false,
  clone_from_link_id bigint,
  master_lock_id bigint,
  shared_link_id bigint,
  relation_data jsonb,
  other_data jsonb,
  tags int[],
  sort_order int not null default 99,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp,
  foreign key (clone_from_link_id) references contact(id),
  foreign key (master_lock_id) references contact(id),
  foreign key (shared_link_id) references contact(id)
);

create table invite (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  created_by bigint not null REFERENCES users(id),
  contact_id bigint not null REFERENCES contact (id),
  contact_method contact_method not null default ('email'),
  token varchar(512) not null,
  status request_status not null DEFAULT 'request',
  message text,
  user_id bigint REFERENCES users(id),
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table groups (
  id serial primary key,
  created_by bigint not null REFERENCES users(id),
  name varchar(64) not null,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp,
  unique (created_by,name)
);

create table tag (
  id serial primary key,
  created_by bigint not null REFERENCES users(id),
  name varchar(64) not null,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp,
  unique (created_by,name)
);

create table address (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  created_by bigint not null REFERENCES users (id),
  contact_id bigint not null REFERENCES contact (id),
  name varchar(256),
  street varchar(256) not null,
  suburb varchar(256),
  postcode varchar(10) not null,
  state char(3) not null default 'NSW',
  country char(2) not null default 'AU',
  sort_order int not null default 99,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

alter table users add constraint fk_user_contact foreign key (contact_id) REFERENCES contact(id) ON DELETE CASCADE;
alter table contact add constraint fk_contact_address foreign key (address_id) REFERENCES address(id) ON DELETE CASCADE;

insert into users (username, password) VALUES ('guest',md5('guest'));
insert into groups (created_by, name) VALUES (1,'family');
insert into groups (created_by, name) VALUES (1,'friends');
insert into groups (created_by, name) VALUES (1,'work');

insert into contact (created_by, name) VALUES (1,'first contact');
update org set contact_id=1 where username='guest';

insert into groups (created_by, name) VALUES (1, 'custom');
insert into contact (created_by, name, groups, relation_data, gender) VALUES (1,'second contact', '{1, 4}','[{"rid":"parent", "cid": "1"}]', 'female');

insert into address (created_by, contact_id, street, postcode) VALUES (1,1,'street2',2000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,1,'street3',3000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,2,'street4',4000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,2,'street5',5000);

select c.id, c.name, c.gender, c.groups, c.relation_data from contact c, users u where c.created_by=u.id and u.id=1 order by sort_order,id;
select c.id, c.name, a.street, a.postcode from contact c, address a where a.contact_id=c.id order by c.sort_order,id;
select id,name,groups from contact where '4' = ANY(groups);
