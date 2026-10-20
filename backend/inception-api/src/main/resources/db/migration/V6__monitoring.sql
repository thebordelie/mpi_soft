
CREATE TABLE operation_launch (
    operation_id              BIGINT PRIMARY KEY REFERENCES operations (id) ON DELETE CASCADE,
    current_step              INT          NOT NULL DEFAULT 0,
    sedation_readiness        VARCHAR(20)  NOT NULL DEFAULT 'pending',
    sedation_rejection_reason TEXT,
    sedation_confirmed_at     TIMESTAMPTZ,
    sedation_confirmed_by     BIGINT REFERENCES users (id),
    launched_at               TIMESTAMPTZ,
    launched_by               BIGINT REFERENCES users (id),
    CONSTRAINT chk_sedation_readiness CHECK (
        sedation_readiness IN ('pending', 'confirmed', 'rejected')
    ),
    CONSTRAINT chk_launch_step CHECK (current_step >= 0 AND current_step <= 2)
);

CREATE TABLE pasiv_connections (
    id                 BIGSERIAL PRIMARY KEY,
    operation_id       BIGINT      NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
    participant_id     BIGINT      NOT NULL REFERENCES operation_participants (id) ON DELETE CASCADE,
    connection_status  VARCHAR(20) NOT NULL DEFAULT 'disconnected',
    channel_status     VARCHAR(20) NOT NULL DEFAULT 'offline',
    sedation_active    BOOLEAN     NOT NULL DEFAULT FALSE,
    UNIQUE (operation_id, participant_id),
    CONSTRAINT chk_pasiv_connection CHECK (
        connection_status IN ('disconnected', 'connecting', 'connected')
    ),
    CONSTRAINT chk_pasiv_channel CHECK (
        channel_status IN ('offline', 'stable', 'unstable')
    )
);

CREATE INDEX idx_pasiv_connections_operation ON pasiv_connections (operation_id);
