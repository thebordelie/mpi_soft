
CREATE TABLE operation_planning (
    operation_id            BIGINT PRIMARY KEY REFERENCES operations (id) ON DELETE CASCADE,
    architecture_fixed_at   TIMESTAMPTZ,
    architecture_fixed_by   BIGINT REFERENCES users (id),
    sedation_fixed_at       TIMESTAMPTZ,
    sedation_fixed_by       BIGINT REFERENCES users (id),
    scenarios_fixed_at      TIMESTAMPTZ,
    scenarios_fixed_by      BIGINT REFERENCES users (id)
);

-- Архитектура сна
CREATE TABLE dream_levels (
    id              BIGSERIAL PRIMARY KEY,
    operation_id    BIGINT       NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
    parent_level_id BIGINT       REFERENCES dream_levels (id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT         NOT NULL DEFAULT '',
    goal            TEXT         NOT NULL DEFAULT '',
    sort_order      INT          NOT NULL DEFAULT 0
);

CREATE TABLE dream_level_participants (
    level_id       BIGINT NOT NULL REFERENCES dream_levels (id) ON DELETE CASCADE,
    participant_id BIGINT NOT NULL REFERENCES operation_participants (id) ON DELETE CASCADE,
    PRIMARY KEY (level_id, participant_id)
);

CREATE TABLE dream_key_events (
    id          BIGSERIAL PRIMARY KEY,
    level_id    BIGINT       NOT NULL REFERENCES dream_levels (id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    description TEXT         NOT NULL DEFAULT ''
);

CREATE TABLE dream_key_event_participants (
    key_event_id   BIGINT NOT NULL REFERENCES dream_key_events (id) ON DELETE CASCADE,
    participant_id BIGINT NOT NULL REFERENCES operation_participants (id) ON DELETE CASCADE,
    PRIMARY KEY (key_event_id, participant_id)
);

CREATE INDEX idx_dream_levels_operation ON dream_levels (operation_id);

-- Седация
CREATE TABLE sedation_configs (
    id              BIGSERIAL PRIMARY KEY,
    operation_id    BIGINT        NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
    level_id        BIGINT        NOT NULL REFERENCES dream_levels (id) ON DELETE CASCADE,
    participant_id  BIGINT        NOT NULL REFERENCES operation_participants (id) ON DELETE CASCADE,
    compound        VARCHAR(50)   NOT NULL,
    dosage          NUMERIC(10,2) NOT NULL,
    duration_hours  NUMERIC(10,2) NOT NULL,
    method          VARCHAR(30)   NOT NULL,
    notes           TEXT          NOT NULL DEFAULT ''
);

CREATE INDEX idx_sedation_configs_operation ON sedation_configs (operation_id);

-- Сценарии взаимодействия
CREATE TABLE interaction_scenarios (
    id              BIGSERIAL PRIMARY KEY,
    operation_id    BIGINT       NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
    level_id        BIGINT       NOT NULL REFERENCES dream_levels (id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT         NOT NULL DEFAULT '',
    trigger_text    TEXT         NOT NULL DEFAULT '',
    expected_result TEXT         NOT NULL DEFAULT ''
);

CREATE TABLE scenario_participants (
    scenario_id    BIGINT NOT NULL REFERENCES interaction_scenarios (id) ON DELETE CASCADE,
    participant_id BIGINT NOT NULL REFERENCES operation_participants (id) ON DELETE CASCADE,
    PRIMARY KEY (scenario_id, participant_id)
);

CREATE INDEX idx_scenarios_operation ON interaction_scenarios (operation_id);
