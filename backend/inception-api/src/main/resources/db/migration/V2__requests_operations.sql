
CREATE TABLE operation_requests (
    id                  BIGSERIAL PRIMARY KEY,
    status              VARCHAR(20)  NOT NULL DEFAULT 'draft',
    name                VARCHAR(200) NOT NULL DEFAULT '',
    description         TEXT         NOT NULL DEFAULT '',
    planned_date        DATE,
    target_full_name    VARCHAR(200) NOT NULL DEFAULT '',
    target_birth_date   DATE,
    target_description  TEXT         NOT NULL DEFAULT '',
    target_behavior     TEXT         NOT NULL DEFAULT '',
    goal                VARCHAR(30),
    desired_result      TEXT         NOT NULL DEFAULT '',
    success_criteria    TEXT         NOT NULL DEFAULT '',
    organization        VARCHAR(200) NOT NULL DEFAULT '',
    customer_id         BIGINT       NOT NULL REFERENCES users (id),
    organizer_id        BIGINT       REFERENCES users (id),
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    CONSTRAINT chk_request_status CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    CONSTRAINT chk_request_goal CHECK (
        goal IS NULL OR goal IN ('inception', 'extraction', 'research', 'training')
    )
);

CREATE INDEX idx_requests_customer_status ON operation_requests (customer_id, status);
CREATE INDEX idx_requests_organizer_status ON operation_requests (organizer_id, status);

CREATE TABLE operations (
    id                  BIGSERIAL PRIMARY KEY,
    request_id          BIGINT       UNIQUE REFERENCES operation_requests (id),
    name                VARCHAR(200) NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',
    target_full_name    VARCHAR(200) NOT NULL,
    target_birth_date   DATE,
    target_description  TEXT         NOT NULL DEFAULT '',
    customer_login      VARCHAR(50)  NOT NULL,
    customer_company    VARCHAR(200) NOT NULL DEFAULT '',
    planned_date        DATE,
    success_criteria    TEXT         NOT NULL DEFAULT '',
    created_by          BIGINT       NOT NULL REFERENCES users (id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_operation_status CHECK (
        status IN ('draft', 'planning', 'active', 'ready', 'launch', 'running', 'completed', 'cancelled')
    )
);

CREATE TABLE operation_participants (
    id            BIGSERIAL PRIMARY KEY,
    operation_id  BIGINT      NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
    user_id       BIGINT      NOT NULL REFERENCES users (id),
    role          VARCHAR(30) NOT NULL,
    UNIQUE (operation_id, user_id),
    CONSTRAINT chk_participant_role CHECK (
        role IN ('architect', 'chemist', 'impersonator', 'extractor')
    )
);

CREATE INDEX idx_operations_created_by ON operations (created_by);
CREATE INDEX idx_operation_participants_user ON operation_participants (user_id);
