CREATE TABLE [dbo].[letter_tags] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [normalized_name] NVARCHAR(100) NOT NULL,
    [create_date] DATETIME,
    CONSTRAINT [PK_letter_tags] PRIMARY KEY ([id]),
    CONSTRAINT [UX_letter_tags_normalized_name] UNIQUE ([normalized_name])
);

CREATE TABLE [dbo].[letter_tag_links] (
    [id] INT NOT NULL IDENTITY(1,1),
    [letter_id] INT NOT NULL,
    [tag_id] INT NOT NULL,
    [create_date] DATETIME,
    CONSTRAINT [PK_letter_tag_links] PRIMARY KEY ([id]),
    CONSTRAINT [UX_letter_tag_links_letter_tag] UNIQUE ([letter_id], [tag_id])
);

CREATE INDEX [IX_letter_tags_name] ON [dbo].[letter_tags]([name]);
CREATE INDEX [IX_letter_tag_links_letter] ON [dbo].[letter_tag_links]([letter_id]);
CREATE INDEX [IX_letter_tag_links_tag] ON [dbo].[letter_tag_links]([tag_id]);

ALTER TABLE [dbo].[letter_tag_links]
ADD CONSTRAINT [FK_letter_tag_links_letters]
FOREIGN KEY ([letter_id]) REFERENCES [dbo].[letters]([id])
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[letter_tag_links]
ADD CONSTRAINT [FK_letter_tag_links_tags]
FOREIGN KEY ([tag_id]) REFERENCES [dbo].[letter_tags]([id])
ON DELETE CASCADE ON UPDATE NO ACTION;
