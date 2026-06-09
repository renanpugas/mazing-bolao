UPDATE user
SET is_admin = 1,
    updated_at = CAST(unixepoch('subsecond') * 1000 AS INTEGER)
WHERE id = (
  SELECT id
  FROM user
  WHERE NOT EXISTS (SELECT 1 FROM user WHERE is_admin = 1)
  ORDER BY created_at ASC
  LIMIT 1
);
