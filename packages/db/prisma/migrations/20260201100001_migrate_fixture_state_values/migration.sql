-- Migrate old enum values to new ones (CAN/INT/LIVE remain in enum but are no longer used by app).
-- Must run in a separate migration after enum values are committed.
UPDATE fixtures SET state = 'CANCELLED' WHERE state = 'CAN';
UPDATE fixtures SET state = 'INTERRUPTED' WHERE state = 'INT';
UPDATE fixtures SET state = 'INPLAY_1ST_HALF' WHERE state = 'LIVE';
