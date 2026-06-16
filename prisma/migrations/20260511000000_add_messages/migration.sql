CREATE TABLE [dbo].[messages] (
  [id] INT NOT NULL IDENTITY(1,1),
  [title] NVARCHAR(500) NOT NULL,
  [contents] NVARCHAR(MAX),
  [importance] INT NOT NULL CONSTRAINT [DF_messages_importance] DEFAULT 1,
  [sender_id] INT,
  [create_date] DATETIME,
  [parent_message_id] INT,
  [forwarded_from_message_id] INT,
  CONSTRAINT [PK_messages] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[message_recipients] (
  [id] INT NOT NULL IDENTITY(1,1),
  [message_id] INT NOT NULL,
  [user_id] INT NOT NULL,
  [read_at] DATETIME,
  [read_notification_seen_at] DATETIME,
  CONSTRAINT [PK_message_recipients] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UX_message_recipients_message_user] UNIQUE ([message_id], [user_id])
);

CREATE INDEX [IX_messages_sender]
ON [dbo].[messages]([sender_id]);

CREATE INDEX [IX_messages_create_date]
ON [dbo].[messages]([create_date]);

CREATE INDEX [IX_message_recipients_user_read]
ON [dbo].[message_recipients]([user_id], [read_at]);

CREATE INDEX [IX_message_recipients_message]
ON [dbo].[message_recipients]([message_id]);

ALTER TABLE [dbo].[messages]
ADD CONSTRAINT [FK_messages_sender_users]
FOREIGN KEY ([sender_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[messages]
ADD CONSTRAINT [FK_messages_parent]
FOREIGN KEY ([parent_message_id]) REFERENCES [dbo].[messages]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[messages]
ADD CONSTRAINT [FK_messages_forwarded_from]
FOREIGN KEY ([forwarded_from_message_id]) REFERENCES [dbo].[messages]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[message_recipients]
ADD CONSTRAINT [FK_message_recipients_messages]
FOREIGN KEY ([message_id]) REFERENCES [dbo].[messages]([id])
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[message_recipients]
ADD CONSTRAINT [FK_message_recipients_users]
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;
