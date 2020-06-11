CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

alter table contact drop constraint if exists fk_contact_address;
drop table if exists address;
drop table if exists custom_groups;
alter table account drop constraint if exists fk_account_profile;
drop table if exists contact;
drop table if exists account;
drop type if exists relation;
drop type if exists groups;

CREATE TYPE relation AS ENUM ('parent', 'child', 'spouse', 'adpotee', 'closefriend');
CREATE TYPE groups AS ENUM ('family', 'friends', 'work');

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
  names jsonb,
  email varchar(256),
  emails jsonb,
  mobile varchar(16),
  phones jsonb,
  dob date,
  wedding date,
  death date,
  dates jsonb,
  address_id bigint,
  gender varchar(6),
  notes text,
  groups groups[],
  custom_groups jsonb,
  relations jsonb,
  links jsonb,
  tags jsonb,
  sort_order int not null default 99,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table custom_groups (
  id serial primary key,
  created_by bigint not null REFERENCES account(id),
  label varchar(64) not null,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp,
  unique (created_by,label)
);

create table address (
  id serial primary key,
  uuid uuid not null unique DEFAULT uuid_generate_v4(),
  created_by bigint not null REFERENCES account (id),
  contact_id bigint not null REFERENCES contact (id),
  label varchar(256),
  street varchar(256) not null,
  suburb varchar(256),
  postcode numeric(6,0) not null,
  state char(3) not null default 'NSW',
  country char(2) not null default 'AU',
  sort_order int not null default 99,
  tags jsonb,
  created_at timestamp not null default now(),
  updated_at timestamp,
  deleted_at timestamp
);

alter table account add constraint fk_account_profile foreign key (contact_id) REFERENCES contact(id) ON DELETE CASCADE;
alter table contact add constraint fk_contact_address foreign key (address_id) REFERENCES address(id) ON DELETE CASCADE;

insert into account (username, password) VALUES ('admin',md5('admin'));
insert into contact (created_by, name) VALUES (1,'first contact');
update account set contact_id=1 where username='admin';

insert into custom_groups (created_by, label) VALUES (1, 'club');
insert into contact (created_by, name, groups, custom_groups, relations) VALUES (1,'second contact', '{family,friends}'::groups[], '["club"]','[{"rid":"parent", "cid": "1"}]');

insert into address (created_by, contact_id, street, postcode) VALUES (1,1,'street2',2000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,1,'street3',3000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,2,'street4',4000);
insert into address (created_by, contact_id, street, postcode) VALUES (1,2,'street5',5000);

select c.id, c.name, c.groups, c.custom_groups, c.relations from contact c, account a where c.created_by=a.id and a.id=1 order by sort_order,id;
select c.id, c.name, a.street, a.postcode from contact c, address a where a.contact_id=c.id order by c.sort_order,id;
select id,name,groups from contact where 'friends' = ANY(groups);
