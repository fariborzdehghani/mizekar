ALTER TABLE [dbo].[letter_referrals]
ADD [read_at] DATETIME;

CREATE INDEX [IX_letter_referrals_receiver_read]
ON [dbo].[letter_referrals]([receiver_id], [read_at]);
