
CREATE TABLE operation_events (
    id            BIGSERIAL PRIMARY KEY,
    operation_id  BIGINT       NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
    actor_login   VARCHAR(50)  NOT NULL,
    action        VARCHAR(200) NOT NULL,
    details       TEXT         NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operation_events_operation_created
    ON operation_events (operation_id, created_at DESC);
