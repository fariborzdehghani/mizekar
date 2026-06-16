IF OBJECT_ID(N'dbo.form_templates', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.form_templates (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_form_templates PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    template_file_id INT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_form_templates_is_active DEFAULT (1),
    is_deleted BIT NOT NULL CONSTRAINT DF_form_templates_is_deleted DEFAULT (0),
    create_date DATETIME NULL,
    creator_id INT NULL,
    CONSTRAINT FK_form_templates_files FOREIGN KEY (template_file_id) REFERENCES dbo.files(id),
    CONSTRAINT FK_form_templates_users FOREIGN KEY (creator_id) REFERENCES dbo.users(id)
  );

  CREATE INDEX IX_form_templates_active ON dbo.form_templates(is_active, is_deleted);
END;

IF OBJECT_ID(N'dbo.form_templates', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.form_templates', N'is_deleted') IS NULL
BEGIN
  ALTER TABLE dbo.form_templates
    ADD is_deleted BIT NOT NULL CONSTRAINT DF_form_templates_is_deleted DEFAULT (0);
END;

IF OBJECT_ID(N'dbo.form_process_steps', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.form_process_steps (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_form_process_steps PRIMARY KEY,
    template_id INT NOT NULL,
    step_order INT NOT NULL,
    title NVARCHAR(200) NULL,
    approver_user_id INT NOT NULL,
    CONSTRAINT FK_form_process_steps_templates FOREIGN KEY (template_id) REFERENCES dbo.form_templates(id) ON DELETE CASCADE,
    CONSTRAINT FK_form_process_steps_users FOREIGN KEY (approver_user_id) REFERENCES dbo.users(id),
    CONSTRAINT UX_form_process_steps_template_order UNIQUE (template_id, step_order)
  );

  CREATE INDEX IX_form_process_steps_approver ON dbo.form_process_steps(approver_user_id);
END;

IF OBJECT_ID(N'dbo.form_instances', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.form_instances (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_form_instances PRIMARY KEY,
    template_id INT NOT NULL,
    title NVARCHAR(300) NOT NULL,
    creator_id INT NULL,
    current_file_id INT NULL,
    status INT NOT NULL CONSTRAINT DF_form_instances_status DEFAULT (0),
    current_step_order INT NULL,
    create_date DATETIME NULL,
    submit_date DATETIME NULL,
    complete_date DATETIME NULL,
    reject_date DATETIME NULL,
    CONSTRAINT FK_form_instances_templates FOREIGN KEY (template_id) REFERENCES dbo.form_templates(id),
    CONSTRAINT FK_form_instances_files FOREIGN KEY (current_file_id) REFERENCES dbo.files(id),
    CONSTRAINT FK_form_instances_users FOREIGN KEY (creator_id) REFERENCES dbo.users(id)
  );

  CREATE INDEX IX_form_instances_creator ON dbo.form_instances(creator_id, create_date);
  CREATE INDEX IX_form_instances_status_step ON dbo.form_instances(status, current_step_order);
END;

IF OBJECT_ID(N'dbo.form_instance_steps', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.form_instance_steps (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_form_instance_steps PRIMARY KEY,
    instance_id INT NOT NULL,
    step_order INT NOT NULL,
    title NVARCHAR(200) NULL,
    approver_user_id INT NOT NULL,
    status INT NOT NULL CONSTRAINT DF_form_instance_steps_status DEFAULT (0),
    action_date DATETIME NULL,
    comments NTEXT NULL,
    CONSTRAINT FK_form_instance_steps_instances FOREIGN KEY (instance_id) REFERENCES dbo.form_instances(id) ON DELETE CASCADE,
    CONSTRAINT FK_form_instance_steps_users FOREIGN KEY (approver_user_id) REFERENCES dbo.users(id),
    CONSTRAINT UX_form_instance_steps_instance_order UNIQUE (instance_id, step_order)
  );

  CREATE INDEX IX_form_instance_steps_approver_status ON dbo.form_instance_steps(approver_user_id, status);
END;

IF OBJECT_ID(N'dbo.form_referrals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.form_referrals (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_form_referrals PRIMARY KEY,
    instance_id INT NOT NULL,
    sender_id INT NULL,
    receiver_id INT NULL,
    date_time DATETIME NULL,
    contents NTEXT NULL,
    status INT NULL,
    read_at DATETIME NULL,
    CONSTRAINT FK_form_referrals_instances FOREIGN KEY (instance_id) REFERENCES dbo.form_instances(id) ON DELETE CASCADE,
    CONSTRAINT FK_form_referrals_sender_users FOREIGN KEY (sender_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_form_referrals_receiver_users FOREIGN KEY (receiver_id) REFERENCES dbo.users(id)
  );

  CREATE INDEX IX_form_referrals_receiver_read ON dbo.form_referrals(receiver_id, read_at);
  CREATE INDEX IX_form_referrals_sender_date ON dbo.form_referrals(sender_id, date_time);
END;
