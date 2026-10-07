-- Additive operator-only fictional demo data. Never replays seed, creates Auth accounts or AI usage.
begin;
do $$
declare w constant uuid := '10000000-0000-4000-8000-000000000001';
 a constant uuid := '10000000-0000-4000-8000-000000000002';
 today timestamptz := date_trunc('day',now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
begin
 if current_user <> 'postgres' then raise exception 'OPERATOR_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('pflege_demo_staff_data_v1',0));
 if not exists(select 1 from public.profiles where id=a and workspace_id=w and kind='system' and user_id is null)
  then raise exception 'DEMO_WORKSPACE_REQUIRED'; end if;
 insert into public.contacts(id,workspace_id,created_by,kind,name,address,email) values
  ('20000000-0000-4000-8000-000000000010',w,a,'insurer','Pflegekasse Lindenblick · fiktiv','{"street":"Musterallee 4","postal_code":"00000","city":"Demostadt"}','lindenblick@example.invalid'),
  ('20000000-0000-4000-8000-000000000011',w,a,'insurer','Pflegekasse Hafenlicht · fiktiv','{"street":"Beispielweg 6","postal_code":"00000","city":"Demostadt"}','hafenlicht@example.invalid'),
  ('20000000-0000-4000-8000-000000000012',w,a,'insurer','Pflegekasse Bergwiese · fiktiv','{"street":"Demoplatz 2","postal_code":"00000","city":"Demostadt"}','bergwiese@example.invalid')
 on conflict(id) do nothing;
 insert into public.care_recipients(id,workspace_id,created_by,name,care_grade,birth_date,insurer_contact_id,summary) values
  ('20000000-0000-4000-8000-000000000020',w,a,'Frieda Linden · fiktiv',1,'1952-03-14','20000000-0000-4000-8000-000000000010','Erfundene Demoperson. Lebt selbstständig; Sohn organisiert Beratung und Hilfe im Alltag.'),
  ('20000000-0000-4000-8000-000000000021',w,a,'Karl Eichen · fiktiv',2,'1946-08-22','20000000-0000-4000-8000-000000000010','Erfundene Demoperson. Familie sammelt Unterlagen und plant Unterstützung für den Morgen.'),
  ('20000000-0000-4000-8000-000000000022',w,a,'Hannelore Berg · fiktiv',4,'1940-01-09','20000000-0000-4000-8000-000000000012','Erfundene Demoperson. Angehörige stimmen Betreuung und einen Beratungstermin ab.'),
  ('20000000-0000-4000-8000-000000000023',w,a,'Emil Strom · fiktiv',5,'1943-11-02','20000000-0000-4000-8000-000000000011','Erfundene Demoperson. Tochter organisiert umfangreiche Unterstützung und eine Urlaubsvertretung.'),
  ('20000000-0000-4000-8000-000000000024',w,a,'Nora Hafen · fiktiv',0,'1960-06-17','20000000-0000-4000-8000-000000000011','Erfundene Demoperson ohne festgestellten Pflegegrad. Familie bereitet Fragen für eine erste Beratung vor.')
 on conflict(id) do nothing;
 insert into public.conversations(id,workspace_id,created_by,title,care_recipient_id) values
  ('20000000-0000-4000-8000-000000000050',w,a,'Alltagshilfe planen · fiktive Demo','20000000-0000-4000-8000-000000000020'),
  ('20000000-0000-4000-8000-000000000051',w,a,'Unterlagen ordnen · fiktive Demo','20000000-0000-4000-8000-000000000021'),
  ('20000000-0000-4000-8000-000000000052',w,a,'Beratung vorbereiten · fiktive Demo','20000000-0000-4000-8000-000000000022'),
  ('20000000-0000-4000-8000-000000000053',w,a,'Vertretung vorbereiten · fiktive Demo','20000000-0000-4000-8000-000000000023'),
  ('20000000-0000-4000-8000-000000000054',w,a,'Erstberatung · fiktive Demo','20000000-0000-4000-8000-000000000024')
 on conflict(id) do nothing;
 -- Empty stored conversations are planning examples, not generated model answers.
 insert into public.tasks(id,workspace_id,created_by,care_recipient_id,title,description,due_at,deadline_source,priority,status) values
  ('20000000-0000-4000-8000-000000000070',w,a,'20000000-0000-4000-8000-000000000020','Beratungsstelle anrufen','Fiktive manuelle Aufgabenplanung.',today+interval '15 hours','Fiktiver manueller Demotermin','urgent','open'),
  ('20000000-0000-4000-8000-000000000071',w,a,'20000000-0000-4000-8000-000000000020','Alltagshilfe vergleichen','Fiktive manuelle Aufgabenplanung.',today+interval '8 days 10 hours','Fiktiver manueller Demotermin','normal','open'),
  ('20000000-0000-4000-8000-000000000072',w,a,'20000000-0000-4000-8000-000000000021','Unterlagen für Beratung sammeln','Fiktive manuelle Aufgabenplanung.',today+interval '1 day 10 hours','Fiktiver manueller Demotermin','high','in_progress'),
  ('20000000-0000-4000-8000-000000000073',w,a,'20000000-0000-4000-8000-000000000021','Fragen für den Morgen notieren','Fiktive manuelle Aufgabenplanung.',null,null,'normal','open'),
  ('20000000-0000-4000-8000-000000000074',w,a,'20000000-0000-4000-8000-000000000022','Betreuungszeiten abstimmen','Fiktive manuelle Aufgabenplanung.',today+interval '1 day 14 hours','Fiktiver manueller Demotermin','high','open'),
  ('20000000-0000-4000-8000-000000000075',w,a,'20000000-0000-4000-8000-000000000022','Pflegestützpunkt-Termin vorbereiten','Fiktive manuelle Aufgabenplanung.',today+interval '7 days 11 hours','Fiktiver manueller Demotermin','normal','open'),
  ('20000000-0000-4000-8000-000000000076',w,a,'20000000-0000-4000-8000-000000000023','Vertretung mit der Familie klären','Fiktive manuelle Aufgabenplanung.',today+interval '18 hours','Fiktiver manueller Demotermin','urgent','open'),
  ('20000000-0000-4000-8000-000000000077',w,a,'20000000-0000-4000-8000-000000000023','Urlaubsplanung besprechen','Fiktive manuelle Aufgabenplanung.',today+interval '12 days 9 hours','Fiktiver manueller Demotermin','normal','open'),
  ('20000000-0000-4000-8000-000000000078',w,a,'20000000-0000-4000-8000-000000000024','Erstberatung vorbereiten','Fiktive manuelle Aufgabenplanung.',today+interval '2 days 10 hours','Fiktiver manueller Demotermin','high','open'),
  ('20000000-0000-4000-8000-000000000079',w,a,'20000000-0000-4000-8000-000000000024','Fragen zum Pflegegrad sammeln','Fiktive manuelle Aufgabenplanung.',null,null,'normal','open')
 on conflict(id) do nothing;
 insert into public.notes(id,workspace_id,created_by,care_recipient_id,body) values
  ('20000000-0000-4000-8000-000000000080',w,a,'20000000-0000-4000-8000-000000000022','Fiktive Demo: Die Familie möchte die Zuständigkeiten bei einem gemeinsamen Gespräch klären.'),
  ('20000000-0000-4000-8000-000000000081',w,a,'20000000-0000-4000-8000-000000000024','Fiktive Demo: Noch keine Einstufung vorhanden. Keine Leistungen oder Rechtsfristen zugesagt.')
 on conflict(id) do nothing;
 if not exists(select 1 from public.audit_log where workspace_id=w and action='demo.staff_data_v1.added') then
  insert into public.audit_log(workspace_id,created_by,action,outcome,metadata)
   values(w,a,'demo.staff_data_v1.added','success','{"fictional":true,"providerCalls":0,"authAccounts":0,"additive":true,"additionalPeople":5,"additionalOpenTasks":10,"additionalEmptyConversations":5}');
 end if;
end $$;
commit;
