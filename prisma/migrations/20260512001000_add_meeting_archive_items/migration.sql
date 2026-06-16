CREATE TABLE [dbo].[meeting_archive_items] (
  [id] INT NOT NULL IDENTITY(1,1),
  [user_id] INT NOT NULL,
  [folder_id] INT NOT NULL,
  [meeting_id] INT NOT NULL,
  [create_date] DATETIME,
  [update_date] DATETIME,
  CONSTRAINT [PK_meeting_archive_items] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UX_meeting_archive_items_user_meeting] UNIQUE ([user_id], [meeting_id])
);

CREATE INDEX [IX_meeting_archive_items_folder]
ON [dbo].[meeting_archive_items]([folder_id]);

CREATE INDEX [IX_meeting_archive_items_meeting]
ON [dbo].[meeting_archive_items]([meeting_id]);

ALTER TABLE [dbo].[meeting_archive_items]
ADD CONSTRAINT [FK_meeting_archive_items_users]
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meeting_archive_items]
ADD CONSTRAINT [FK_meeting_archive_items_folders]
FOREIGN KEY ([folder_id]) REFERENCES [dbo].[letter_archive_folders]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meeting_archive_items]
ADD CONSTRAINT [FK_meeting_archive_items_meetings]
FOREIGN KEY ([meeting_id]) REFERENCES [dbo].[meetings]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;
