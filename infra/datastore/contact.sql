CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

alter table contact drop constraint if exists fk_contact_address;
drop table if exists address;
alter table account drop constraint if exists fk_account_profile;
drop table if exists tag;
drop table if exists groups;
drop table if exists contact;
drop table if exists account;
drop type if exists relation;
drop type if exists gender;

CREATE TYPE relation AS ENUM ('parent', 'child', 'spouse', 'adpotee', 'closefriend');
CREATE TYPE gender AS ENUM ('male', 'female');

create table account (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  username varchar(64) not null unique,
  password varchar(256) not null,
  contact_id bigint,
  domain varchar(64),
  token varchar(64),
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table contact (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  created_by bigint not null REFERENCES account(id),
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
  relation_data jsonb,
  other_data jsonb,
  tags int[],
  sort_order int not null default 99,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table groups (
  id serial primary key,
  created_by bigint not null REFERENCES account(id),
  name varchar(64) not null,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp,
  unique (created_by,name)
);

create table tag (
  id serial primary key,
  created_by bigint not null REFERENCES account(id),
  name varchar(64) not null,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp,
  unique (created_by,name)
);

create table address (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  created_by bigint not null REFERENCES account (id),
  contact_id bigint not null REFERENCES contact (id),
  name varchar(256),
  street varchar(256) not null,
  suburb varchar(256),
  postcode numeric(6,0) not null,
  state char(3) not null default 'NSW',
  country char(2) not null default 'AU',
  sort_order int not null default 99,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

alter table account add constraint fk_account_profile foreign key (contact_id) REFERENCES contact(id) ON DELETE CASCADE;
alter table contact add constraint fk_contact_address foreign key (address_id) REFERENCES address(id) ON DELETE CASCADE;

insert into account (username, password) VALUES ('admin',md5('admin'));
insert into groups (created_by, name) VALUES (1,'family');
insert into groups (created_by, name) VALUES (1,'friends');
insert into groups (created_by, name) VALUES (1,'work');

insert into contact (created_by, name) VALUES (1,'first contact');
update account set contact_id=1 where username='admin';

insert into groups (created_by, name) VALUES (1, 'club');
insert into contact (created_by, name, groups, relation_data, gender) VALUES (1,'second contact', '{1, 4}','[{"rid":"parent", "cid": "1"}]', 'female');

insert into address (created_by, contact_id, street, postcode) VALUES (1,1,'street2',2000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,1,'street3',3000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,2,'street4',4000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,2,'street5',5000);

select c.id, c.name, c.gender, c.groups, c.relation_data from contact c, account a where c.created_by=a.id and a.id=1 order by sort_order,id;
select c.id, c.name, a.street, a.postcode from contact c, address a where a.contact_id=c.id order by c.sort_order,id;
select id,name,groups from contact where '4' = ANY(groups);
