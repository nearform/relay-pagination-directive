drop table if exists people;

drop table if exists films;

drop table if exists people_films;

create table if not exists people (
  id serial not null primary key,
  name text not null,
  born int not null
);

create table if not exists films (
  id serial not null primary key,
  name text not null,
  released int not null
);

create table if not exists people_films (
  id serial not null primary key,
  people_id int not null,
  film_id int not null,
  roles text [],
  performance int,
  rel_type text not null,
  constraint fk_people_id foreign key (people_id) references people(id),
  constraint fk_film_id foreign key (film_id) references films(id)
);

insert into
  "people" ("born", "id", "name")
values
  (1956, 1, 'Tom Hanks'),
  (1952, 2, 'Robert Zemeckis'),
  (1961, 3, 'Michael J Fox');

insert into
  "films" ("id", "name", "released")
values
  (1, 'Forrest Gump', 1994),
  (2, 'Cast Away', 2000),
  (3, 'Back to the Future', 1985);

insert into
  "people_films" (
    "film_id",
    "people_id",
    "performance",
    "rel_type",
    "roles"
  )
values
  (1, 1, 5, 'acted_in', '{"Forrest"}'),
  (1, 2, 5, 'directed', '{}'),
  (2, 1, 2, 'acted_in', '{"Chuck Noland"}'),
  (2, 2, 4, 'directed', '{}'),
  (3, 2, 4, 'directed', '{}'),
  (3, 3, 4, 'acted_in', '{"Marty McFly"}');
