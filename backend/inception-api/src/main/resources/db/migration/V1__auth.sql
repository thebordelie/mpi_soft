
CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL
);

CREATE TABLE privileges (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE role_privileges (
    role_id       BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    privilege_id  BIGINT NOT NULL REFERENCES privileges (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, privilege_id)
);

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    login         VARCHAR(50)  NOT NULL UNIQUE,
    full_name     VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id       BIGINT       NOT NULL REFERENCES roles (id),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_id ON users (role_id);
CREATE INDEX idx_users_login_lower ON users (LOWER(login));

INSERT INTO roles (code, name) VALUES
    ('organizer',    'Организатор'),
    ('customer',     'Заказчик'),
    ('architect',    'Архитектор'),
    ('chemist',      'Химик'),
    ('impersonator', 'Имперсонатор'),
    ('extractor',    'Извлекатель');

INSERT INTO privileges (code, description) VALUES
    ('INCEPTION_CREATE_OPERATION',          'Создание операций'),
    ('INCEPTION_EDIT_OPERATION',            'Редактирование операций'),
    ('INCEPTION_VIEW_OPERATIONS',           'Просмотр всех своих операций (организатор)'),
    ('INCEPTION_VIEW_ASSIGNED_OPERATIONS',  'Просмотр назначенных операций'),
    ('INCEPTION_CHANGE_OPERATION_STATUS',   'Изменение статуса операции'),
    ('INCEPTION_REVIEW_REQUEST',            'Просмотр и рассмотрение заявок'),
    ('INCEPTION_REJECT_REQUEST',            'Отклонение заявок'),
    ('INCEPTION_CONFIRM_REQUEST',           'Подтверждение заявок и создание операции'),
    ('INCEPTION_MANAGE_PARTICIPANTS',       'Управление участниками операции'),
    ('INCEPTION_START_PLANNING',            'Перевод операции в планирование'),
    ('INCEPTION_FINALIZE_OPERATION',        'Фиксация операции перед запуском'),
    ('INCEPTION_LAUNCH_OPERATION',          'Запуск операции'),
    ('INCEPTION_VIEW_EVENT_LOG',            'Просмотр журнала событий'),
    ('INCEPTION_CREATE_REQUEST',            'Создание заявки на операцию'),
    ('INCEPTION_EDIT_REQUEST',              'Редактирование заявки'),
    ('INCEPTION_SUBMIT_REQUEST',            'Отправка заявки на рассмотрение'),
    ('INCEPTION_VIEW_OWN_REQUESTS',         'Просмотр своих заявок'),
    ('INCEPTION_MANAGE_DREAM_ARCHITECTURE', 'Управление архитектурой сна'),
    ('INCEPTION_FIX_DREAM_ARCHITECTURE',    'Фиксация архитектуры сна'),
    ('INCEPTION_MANAGE_SEDATION',           'Настройка параметров седации'),
    ('INCEPTION_FIX_SEDATION',              'Фиксация параметров седации'),
    ('INCEPTION_CONFIRM_PASIV_READINESS',   'Подтверждение готовности к седации (PASIV)'),
    ('INCEPTION_MANAGE_SCENARIOS',          'Управление сценариями взаимодействия'),
    ('INCEPTION_FIX_SCENARIOS',             'Фиксация сценариев взаимодействия');

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id FROM roles r, privileges p
WHERE r.code = 'organizer' AND p.code IN (
    'INCEPTION_CREATE_OPERATION',
    'INCEPTION_EDIT_OPERATION',
    'INCEPTION_VIEW_OPERATIONS',
    'INCEPTION_CHANGE_OPERATION_STATUS',
    'INCEPTION_REVIEW_REQUEST',
    'INCEPTION_REJECT_REQUEST',
    'INCEPTION_CONFIRM_REQUEST',
    'INCEPTION_MANAGE_PARTICIPANTS',
    'INCEPTION_START_PLANNING',
    'INCEPTION_FINALIZE_OPERATION',
    'INCEPTION_LAUNCH_OPERATION',
    'INCEPTION_VIEW_EVENT_LOG'
);

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id FROM roles r, privileges p
WHERE r.code = 'customer' AND p.code IN (
    'INCEPTION_CREATE_REQUEST',
    'INCEPTION_EDIT_REQUEST',
    'INCEPTION_SUBMIT_REQUEST',
    'INCEPTION_VIEW_OWN_REQUESTS'
);

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id FROM roles r, privileges p
WHERE r.code = 'architect' AND p.code IN (
    'INCEPTION_VIEW_ASSIGNED_OPERATIONS',
    'INCEPTION_MANAGE_DREAM_ARCHITECTURE',
    'INCEPTION_FIX_DREAM_ARCHITECTURE',
    'INCEPTION_VIEW_EVENT_LOG'
);

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id FROM roles r, privileges p
WHERE r.code = 'chemist' AND p.code IN (
    'INCEPTION_VIEW_ASSIGNED_OPERATIONS',
    'INCEPTION_MANAGE_SEDATION',
    'INCEPTION_FIX_SEDATION',
    'INCEPTION_CONFIRM_PASIV_READINESS',
    'INCEPTION_VIEW_EVENT_LOG'
);

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id FROM roles r, privileges p
WHERE r.code = 'impersonator' AND p.code IN (
    'INCEPTION_VIEW_ASSIGNED_OPERATIONS',
    'INCEPTION_MANAGE_SCENARIOS',
    'INCEPTION_FIX_SCENARIOS',
    'INCEPTION_VIEW_EVENT_LOG'
);

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id FROM roles r, privileges p
WHERE r.code = 'extractor' AND p.code IN (
    'INCEPTION_VIEW_ASSIGNED_OPERATIONS',
    'INCEPTION_VIEW_EVENT_LOG'
);

INSERT INTO users (login, full_name, password_hash, role_id, enabled, created_at, updated_at)
SELECT
    'thebo',
    'Dom Cobb',
    '$2a$10$pWEamHS9iKMDIocnmH4mOuIw8R8H0ZME9GNiU1OpszMEM9OnorAHq',
    r.id,
    TRUE,
    NOW(),
    NOW()
FROM roles r
WHERE r.code = 'organizer';
