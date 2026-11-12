create unique index documents_set_identity on public.documents(user_id,(payload->>'sessionId'),(payload->>'exerciseId'),(payload->>'index')) where kind='set' and not deleted;
