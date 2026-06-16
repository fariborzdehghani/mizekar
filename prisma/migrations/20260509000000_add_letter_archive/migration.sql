CREATE TABLE [dbo].[letter_archive_folders] (
  [id] INT NOT NULL IDENTITY(1,1),
  [user_id] INT NOT NULL,
  [parent_id] INT NULL,
  [title] NVARCHAR(200) NOT NULL,
  [sort_order] INT NOT NULL CONSTRAINT [DF_letter_archive_folders_sort_order] DEFAULT 0,
  [create_date] DATETIME NULL,
  [update_date] DATETIME NULL,
  CONSTRAINT [PK_letter_archive_folders] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[letter_archive_items] (
  [id] INT NOT NULL IDENTITY(1,1),
  [user_id] INT NOT NULL,
  [folder_id] INT NOT NULL,
  [letter_id] INT NOT NULL,
  [create_date] DATETIME NULL,
  [update_date] DATETIME NULL,
  CONSTRAINT [PK_letter_archive_items] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UX_letter_archive_items_user_letter] UNIQUE ([user_id], [letter_id])
);

CREATE INDEX [IX_letter_archive_folders_user_parent]
ON [dbo].[letter_archive_folders]([user_id], [parent_id]);

CREATE INDEX [IX_letter_archive_items_folder]
ON [dbo].[letter_archive_items]([folder_id]);

CREATE INDEX [IX_letter_archive_items_letter]
ON [dbo].[letter_archive_items]([letter_id]);

ALTER TABLE [dbo].[letter_archive_folders]
ADD CONSTRAINT [FK_letter_archive_folders_users]
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[letter_archive_folders]
ADD CONSTRAINT [FK_letter_archive_folders_parent]
FOREIGN KEY ([parent_id]) REFERENCES [dbo].[letter_archive_folders]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[letter_archive_items]
ADD CONSTRAINT [FK_letter_archive_items_users]
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[letter_archive_items]
ADD CONSTRAINT [FK_letter_archive_items_folders]
FOREIGN KEY ([folder_id]) REFERENCES [dbo].[letter_archive_folders]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[letter_archive_items]
ADD CONSTRAINT [FK_letter_archive_items_letters]
FOREIGN KEY ([letter_id]) REFERENCES [dbo].[letters]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;
