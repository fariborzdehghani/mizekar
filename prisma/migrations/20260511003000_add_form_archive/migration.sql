CREATE TABLE [dbo].[form_archive_items] (
  [id] INT NOT NULL IDENTITY(1,1),
  [user_id] INT NOT NULL,
  [folder_id] INT NOT NULL,
  [form_instance_id] INT NOT NULL,
  [create_date] DATETIME NULL,
  [update_date] DATETIME NULL,
  CONSTRAINT [PK_form_archive_items] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UX_form_archive_items_user_form] UNIQUE ([user_id], [form_instance_id])
);

CREATE INDEX [IX_form_archive_items_folder]
ON [dbo].[form_archive_items]([folder_id]);

CREATE INDEX [IX_form_archive_items_form]
ON [dbo].[form_archive_items]([form_instance_id]);

ALTER TABLE [dbo].[form_archive_items]
ADD CONSTRAINT [FK_form_archive_items_users]
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[form_archive_items]
ADD CONSTRAINT [FK_form_archive_items_folders]
FOREIGN KEY ([folder_id]) REFERENCES [dbo].[letter_archive_folders]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[form_archive_items]
ADD CONSTRAINT [FK_form_archive_items_instances]
FOREIGN KEY ([form_instance_id]) REFERENCES [dbo].[form_instances]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;
