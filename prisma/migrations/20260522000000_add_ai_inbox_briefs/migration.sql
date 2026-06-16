CREATE TABLE [dbo].[ai_inbox_briefs] (
  [id] INT NOT NULL IDENTITY(1,1),
  [user_id] INT NOT NULL,
  [brief_date] DATE NOT NULL,
  [create_date] DATETIME NULL CONSTRAINT [DF_ai_inbox_briefs_create_date] DEFAULT GETDATE(),
  [summary] NVARCHAR(MAX) NULL,
  [tasks_json] NVARCHAR(MAX) NOT NULL,
  [source_items_json] NVARCHAR(MAX) NULL,
  [ai_error] NVARCHAR(MAX) NULL,
  CONSTRAINT [PK_ai_inbox_briefs] PRIMARY KEY CLUSTERED ([id])
);

ALTER TABLE [dbo].[ai_inbox_briefs]
ADD CONSTRAINT [FK_ai_inbox_briefs_users]
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE NONCLUSTERED INDEX [IX_ai_inbox_briefs_user_date]
ON [dbo].[ai_inbox_briefs]([user_id], [brief_date], [create_date]);
