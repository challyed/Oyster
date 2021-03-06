copy
(select objectid as id,
  sum(case when extract(year from "DateOpened") = 2011 then 1 else 0 end) as y_2011,
  sum(case when extract(year from "DateOpened") = 2012 then 1 else 0 end) as y_2012,
  sum(case when extract(year from "DateOpened") = 2013 then 1 else 0 end) as y_2013,
  sum(case when extract(year from "DateOpened") = 2014 then 1 else 0 end) as y_2014
  from "voting-precincts" v left join ce_calls c ON(st_contains(v.geom, c.geom) AND "CaseType" = 'Housing')
  group by objectid
  order by id
) TO STDOUT WITH CSV HEADER;
