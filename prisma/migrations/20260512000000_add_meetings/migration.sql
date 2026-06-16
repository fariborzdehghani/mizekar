CREATE TABLE [dbo].[meetings] (
  [id] INT NOT NULL IDENTITY(1,1),
  [title] NVARCHAR(300) NOT NULL,
  [description] NVARCHAR(MAX),
  [location_type] INT NOT NULL CONSTRAINT [DF_meetings_location_type] DEFAULT 0,
  [location_title] NVARCHAR(MAX),
  [meeting_at] DATETIME NOT NULL,
  [minutes] NTEXT NOT NULL,
  [creator_id] INT,
  [chair_user_id] INT NOT NULL,
  [secretary_user_id] INT NOT NULL,
  [approval_status] INT NOT NULL CONSTRAINT [DF_meetings_approval_status] DEFAULT 0,
  [approved_at] DATETIME,
  [create_date] DATETIME,
  CONSTRAINT [PK_meetings] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[meeting_attendees] (
  [id] INT NOT NULL IDENTITY(1,1),
  [meeting_id] INT NOT NULL,
  [user_id] INT NOT NULL,
  [role] INT NOT NULL CONSTRAINT [DF_meeting_attendees_role] DEFAULT 0,
  CONSTRAINT [PK_meeting_attendees] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UX_meeting_attendees_meeting_user] UNIQUE ([meeting_id], [user_id])
);

CREATE TABLE [dbo].[meeting_referrals] (
  [id] INT NOT NULL IDENTITY(1,1),
  [meeting_id] INT NOT NULL,
  [sender_id] INT,
  [receiver_id] INT,
  [date_time] DATETIME,
  [contents] NTEXT,
  [status] INT,
  [read_at] DATETIME,
  CONSTRAINT [PK_meeting_referrals] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [IX_meetings_meeting_at]
ON [dbo].[meetings]([meeting_at]);

CREATE INDEX [IX_meetings_chair_approval]
ON [dbo].[meetings]([chair_user_id], [approval_status]);

CREATE INDEX [IX_meeting_attendees_user]
ON [dbo].[meeting_attendees]([user_id]);

CREATE INDEX [IX_meeting_referrals_receiver_read]
ON [dbo].[meeting_referrals]([receiver_id], [read_at]);

CREATE INDEX [IX_meeting_referrals_sender_date]
ON [dbo].[meeting_referrals]([sender_id], [date_time]);

ALTER TABLE [dbo].[meetings]
ADD CONSTRAINT [FK_meetings_creator_users]
FOREIGN KEY ([creator_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meetings]
ADD CONSTRAINT [FK_meetings_chair_users]
FOREIGN KEY ([chair_user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meetings]
ADD CONSTRAINT [FK_meetings_secretary_users]
FOREIGN KEY ([secretary_user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meeting_attendees]
ADD CONSTRAINT [FK_meeting_attendees_meetings]
FOREIGN KEY ([meeting_id]) REFERENCES [dbo].[meetings]([id])
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meeting_attendees]
ADD CONSTRAINT [FK_meeting_attendees_users]
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meeting_referrals]
ADD CONSTRAINT [FK_meeting_referrals_meetings]
FOREIGN KEY ([meeting_id]) REFERENCES [dbo].[meetings]([id])
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meeting_referrals]
ADD CONSTRAINT [FK_meeting_referrals_sender_users]
FOREIGN KEY ([sender_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[meeting_referrals]
ADD CONSTRAINT [FK_meeting_referrals_receiver_users]
FOREIGN KEY ([receiver_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;
