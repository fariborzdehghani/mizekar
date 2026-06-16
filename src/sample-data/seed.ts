import "server-only";

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/src/lib/password";
import { prisma } from "@/src/lib/prisma";
import {
  getSampleContentProvider,
  type SamplePerson,
} from "@/src/sample-data/contentProvider";

export const SAMPLE_DATA_MARKER = "[AI_SAMPLE]";

export const SAMPLE_DATA_DEFAULTS = {
  subjectCount: 4,
  lettersPerSubject: 4,
  formsPerSubject: 2,
  meetingsPerSubject: 2,
  messageThreadsPerSubject: 2,
  sampleUserCount: 6,
  sampleUserPassword: "SamplePass123!",
};

export const SAMPLE_DATA_LIMITS = {
  subjectCount: { min: 1, max: 8 },
  lettersPerSubject: { min: 1, max: 8 },
  formsPerSubject: { min: 1, max: 5 },
  meetingsPerSubject: { min: 1, max: 5 },
  messageThreadsPerSubject: { min: 1, max: 5 },
  sampleUserCount: { min: 3, max: 10 },
};

const SAMPLE_USER_PREFIX = "ai_sample_";
const STORED_FILE_PREFIX = "ai-sample-";
const SAMPLE_ROLE_TITLE = `${SAMPLE_DATA_MARKER} تیم بررسی هوش مصنوعی`;

const REFERRAL_OPEN = 0;
const REFERRAL_DONE = 1;

const FORM_STATUS_DRAFT = 0;
const FORM_STATUS_IN_PROGRESS = 1;
const FORM_STATUS_COMPLETED = 2;
const FORM_STATUS_REJECTED = 3;
const FORM_STEP_PENDING = 0;
const FORM_STEP_ACTIVE = 1;
const FORM_STEP_APPROVED = 2;
const FORM_STEP_REJECTED = 3;

const MEETING_APPROVAL_PENDING = 0;
const MEETING_APPROVAL_APPROVED = 1;
const ATTENDEE_MEMBER = 0;
const ATTENDEE_CHAIR = 1;
const ATTENDEE_SECRETARY = 2;

type SampleUser = {
  id: number;
  userId: string;
  displayName: string;
};

type CurrentSeedUser = {
  id: number;
  displayName: string;
};

type SampleDataClient = typeof prisma | Prisma.TransactionClient;

export type SampleDataStats = {
  sampleUsers: number;
  letters: number;
  formTemplates: number;
  formInstances: number;
  meetings: number;
  messages: number;
  archiveFolders: number;
  files: number;
};

export type SampleDataSeedOptions = {
  subjectCount: number;
  lettersPerSubject: number;
  formsPerSubject: number;
  meetingsPerSubject: number;
  messageThreadsPerSubject: number;
  sampleUserCount: number;
  sampleUserPassword: string;
  resetExisting: boolean;
  archiveSamples: boolean;
};

export type SampleDataSeedSummary = {
  runKey: string;
  marker: string;
  contentSource: string;
  deleted?: SampleDataStats;
  created: SampleDataStats & {
    sampleUsersCreated: number;
    sampleUsersReused: number;
    letterRelations: number;
    letterAttachments: number;
    formReferrals: number;
    meetingReferrals: number;
    messageRecipients: number;
    archiveItems: number;
  };
  sampleUserIds: string[];
  sampleUserPassword: string;
};

const emptyStats = (): SampleDataStats => ({
  sampleUsers: 0,
  letters: 0,
  formTemplates: 0,
  formInstances: 0,
  meetings: 0,
  messages: 0,
  archiveFolders: 0,
  files: 0,
});

function markerContainsWhere() {
  return { contains: SAMPLE_DATA_MARKER };
}

function sampleFileWhere() {
  return {
    OR: [
      { file_title: markerContainsWhere() },
      { file_name: { startsWith: STORED_FILE_PREFIX } },
    ],
  };
}

function sampleUserWhere() {
  return {
    user_id: {
      startsWith: SAMPLE_USER_PREFIX,
    },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeOptions(options: SampleDataSeedOptions): SampleDataSeedOptions {
  return {
    ...options,
    subjectCount: clamp(
      options.subjectCount,
      SAMPLE_DATA_LIMITS.subjectCount.min,
      SAMPLE_DATA_LIMITS.subjectCount.max
    ),
    lettersPerSubject: clamp(
      options.lettersPerSubject,
      SAMPLE_DATA_LIMITS.lettersPerSubject.min,
      SAMPLE_DATA_LIMITS.lettersPerSubject.max
    ),
    formsPerSubject: clamp(
      options.formsPerSubject,
      SAMPLE_DATA_LIMITS.formsPerSubject.min,
      SAMPLE_DATA_LIMITS.formsPerSubject.max
    ),
    meetingsPerSubject: clamp(
      options.meetingsPerSubject,
      SAMPLE_DATA_LIMITS.meetingsPerSubject.min,
      SAMPLE_DATA_LIMITS.meetingsPerSubject.max
    ),
    messageThreadsPerSubject: clamp(
      options.messageThreadsPerSubject,
      SAMPLE_DATA_LIMITS.messageThreadsPerSubject.min,
      SAMPLE_DATA_LIMITS.messageThreadsPerSubject.max
    ),
    sampleUserCount: clamp(
      options.sampleUserCount,
      SAMPLE_DATA_LIMITS.sampleUserCount.min,
      SAMPLE_DATA_LIMITS.sampleUserCount.max
    ),
    sampleUserPassword:
      options.sampleUserPassword.trim() ||
      SAMPLE_DATA_DEFAULTS.sampleUserPassword,
  };
}

function buildRunKey() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function subjectPrefix(runKey: string, subjectTitle: string) {
  return `${SAMPLE_DATA_MARKER} ${runKey} - ${subjectTitle}`;
}

function htmlParagraphs(lines: string[]) {
  return lines.map((line) => `<p>${line}</p>`).join("");
}

function getUploadsDir() {
  return path.join(process.cwd(), "public", "uploads");
}

async function removeStoredFiles(fileNames: Array<string | null>) {
  await Promise.all(
    fileNames
      .filter((fileName): fileName is string => Boolean(fileName))
      .filter((fileName) => fileName.startsWith(STORED_FILE_PREFIX))
      .map(async (fileName) => {
        try {
          await fs.unlink(path.join(getUploadsDir(), fileName));
        } catch {
          // The database row is the source of truth for cleanup. Missing files
          // should not block removing sample data rows.
        }
      })
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

let crcTable: number[] | null = null;

function getCrcTable() {
  if (crcTable) return crcTable;

  crcTable = Array.from({ length: 256 }, (_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    return crc >>> 0;
  });

  return crcTable;
}

function crc32(buffer: Buffer) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosTime, dosDate };
}

function createZip(entries: Array<{ name: string; content: string | Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime();

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const content =
      typeof entry.content === "string"
        ? Buffer.from(entry.content, "utf8")
        : entry.content;
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function buildDocxBuffer(title: string, paragraphs: string[]) {
  const paragraphXml = [title, ...paragraphs]
    .map(
      (paragraph) =>
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`
    )
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphXml}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;

  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${escapeXml(title)}</dc:title><dc:creator>داده نمونه میزکار</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Mizekar</Application></Properties>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    },
    {
      name: "word/document.xml",
      content: documentXml,
    },
  ]);
}

async function createStoredFile(
  tx: SampleDataClient,
  input: {
    title: string;
    creatorId: number;
    content: string | Buffer;
  }
) {
  await fs.mkdir(getUploadsDir(), { recursive: true });

  const storedFileName = `${STORED_FILE_PREFIX}${Date.now()}-${crypto.randomUUID()}`;
  await fs.writeFile(path.join(getUploadsDir(), storedFileName), input.content);

  return tx.files.create({
    data: {
      file_name: storedFileName,
      file_title: input.title,
      create_date: new Date(),
      creator_id: input.creatorId,
    },
  });
}

async function ensureSampleUsers(
  tx: SampleDataClient,
  input: {
    creatorId: number;
    people: SamplePerson[];
    userCount: number;
    password: string;
  }
) {
  let created = 0;
  let reused = 0;

  let role = await tx.roles.findFirst({
    where: { title: SAMPLE_ROLE_TITLE },
    select: { id: true },
  });

  if (!role) {
    role = await tx.roles.create({
      data: { title: SAMPLE_ROLE_TITLE },
      select: { id: true },
    });
  }

  const users: SampleUser[] = [];
  const hashedPassword = hashPassword(input.password);

  for (const person of input.people.slice(0, input.userCount)) {
    let user = await tx.users.findFirst({
      where: { user_id: person.userId },
      select: { id: true },
    });

    if (user) {
      reused += 1;
      await tx.users.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          role_id: role.id,
        },
      });
    } else {
      created += 1;
      user = await tx.users.create({
        data: {
          user_id: person.userId,
          password: hashedPassword,
          role_id: role.id,
          creator_id: input.creatorId,
          create_date: new Date(),
        },
        select: { id: true },
      });
    }

    const existingPerson = await tx.persons.findFirst({
      where: { user_id: user.id },
      select: { id: true },
    });

    if (existingPerson) {
      await tx.persons.update({
        where: { id: existingPerson.id },
        data: {
          first_name: person.firstName,
          last_name: person.lastName,
          job: `${SAMPLE_DATA_MARKER} ${person.job}`,
        },
      });
    } else {
      await tx.persons.create({
        data: {
          first_name: person.firstName,
          last_name: person.lastName,
          job: `${SAMPLE_DATA_MARKER} ${person.job}`,
          user_id: user.id,
          creator_id: input.creatorId,
          create_date: new Date(),
        },
      });
    }

    users.push({
      id: user.id,
      userId: person.userId,
      displayName: `${person.firstName} ${person.lastName}`,
    });
  }

  return { users, created, reused };
}

export async function getSampleDataStats(): Promise<SampleDataStats> {
  const [
    sampleUsers,
    letters,
    formTemplates,
    formInstances,
    meetings,
    messages,
    archiveFolders,
    files,
  ] = await Promise.all([
    prisma.users.count({ where: sampleUserWhere() }),
    prisma.letters.count({ where: { title: markerContainsWhere() } }),
    prisma.form_templates.count({ where: { title: markerContainsWhere() } }),
    prisma.form_instances.count({ where: { title: markerContainsWhere() } }),
    prisma.meetings.count({ where: { title: markerContainsWhere() } }),
    prisma.messages.count({ where: { title: markerContainsWhere() } }),
    prisma.letter_archive_folders.count({
      where: { title: markerContainsWhere() },
    }),
    prisma.files.count({ where: sampleFileWhere() }),
  ]);

  return {
    sampleUsers,
    letters,
    formTemplates,
    formInstances,
    meetings,
    messages,
    archiveFolders,
    files,
  };
}

async function deleteSampleContent(options: { deleteSampleUsers?: boolean } = {}): Promise<SampleDataStats> {
  const before = await getSampleDataStats();
  const fileRows = await prisma.files.findMany({
    where: sampleFileWhere(),
    select: { id: true, file_name: true },
  });
  const fileIds = fileRows.map((row) => row.id);

  await prisma.$transaction(
    async (tx) => {
      const letterRows = await tx.letters.findMany({
      where: { title: markerContainsWhere() },
      select: { id: true },
    });
    const templateRows = await tx.form_templates.findMany({
      where: {
        OR: [
          { title: markerContainsWhere() },
          ...(fileIds.length > 0
            ? [{ template_file_id: { in: fileIds } }]
            : []),
        ],
      },
      select: { id: true },
    });
    const templateIds = templateRows.map((row) => row.id);
    const instanceRows = await tx.form_instances.findMany({
      where: {
        OR: [
          { title: markerContainsWhere() },
          ...(fileIds.length > 0
            ? [{ current_file_id: { in: fileIds } }]
            : []),
          ...(templateIds.length > 0
            ? [{ template_id: { in: templateIds } }]
            : []),
        ],
      },
      select: { id: true },
    });
    const meetingRows = await tx.meetings.findMany({
      where: { title: markerContainsWhere() },
      select: { id: true },
    });
    const messageRows = await tx.messages.findMany({
      where: { title: markerContainsWhere() },
      select: { id: true },
    });
    const folderRows = await tx.letter_archive_folders.findMany({
      where: { title: markerContainsWhere() },
      select: { id: true, parent_id: true },
    });

    const letterIds = letterRows.map((row) => row.id);
    const instanceIds = instanceRows.map((row) => row.id);
    const meetingIds = meetingRows.map((row) => row.id);
    const messageIds = messageRows.map((row) => row.id);
    const folderIds = folderRows.map((row) => row.id);

    if (messageIds.length > 0) {
      await tx.message_recipients.deleteMany({
        where: { message_id: { in: messageIds } },
      });
      await tx.messages.updateMany({
        where: { parent_message_id: { in: messageIds } },
        data: { parent_message_id: null },
      });
      await tx.messages.updateMany({
        where: { forwarded_from_message_id: { in: messageIds } },
        data: { forwarded_from_message_id: null },
      });
      await tx.messages.deleteMany({ where: { id: { in: messageIds } } });
    }

    if (letterIds.length > 0 || folderIds.length > 0) {
      await tx.letter_archive_items.deleteMany({
        where: {
          OR: [
            ...(letterIds.length ? [{ letter_id: { in: letterIds } }] : []),
            ...(folderIds.length ? [{ folder_id: { in: folderIds } }] : []),
          ],
        },
      });
      if (letterIds.length > 0) {
        await tx.letter_related_letters.deleteMany({
          where: {
            OR: [
              { main_letter_id: { in: letterIds } },
              { related_letter_id: { in: letterIds } },
            ],
          },
        });
      }
      if (letterIds.length > 0) {
        await tx.letter_attachments.deleteMany({
          where: { letter_id: { in: letterIds } },
        });
        await tx.letter_referrals.deleteMany({
          where: { letter_id: { in: letterIds } },
        });
        await tx.letter_recipients.deleteMany({
          where: { letter_id: { in: letterIds } },
        });
      }
      if (letterIds.length > 0) {
        await tx.letters.deleteMany({ where: { id: { in: letterIds } } });
      }
    }

    if (fileIds.length > 0) {
      await tx.letter_attachments.deleteMany({
        where: { file_id: { in: fileIds } },
      });
    }

    if (instanceIds.length > 0 || folderIds.length > 0) {
      await tx.form_archive_items.deleteMany({
        where: {
          OR: [
            ...(instanceIds.length
              ? [{ form_instance_id: { in: instanceIds } }]
              : []),
            ...(folderIds.length ? [{ folder_id: { in: folderIds } }] : []),
          ],
        },
      });
      if (instanceIds.length > 0) {
        await tx.form_referrals.deleteMany({
          where: { instance_id: { in: instanceIds } },
        });
        await tx.form_instance_steps.deleteMany({
          where: { instance_id: { in: instanceIds } },
        });
        await tx.form_instances.deleteMany({
          where: { id: { in: instanceIds } },
        });
      }
    }

    if (templateIds.length > 0) {
      await tx.form_process_steps.deleteMany({
        where: { template_id: { in: templateIds } },
      });
      await tx.form_templates.deleteMany({
        where: { id: { in: templateIds } },
      });
    }

    if (meetingIds.length > 0 || folderIds.length > 0) {
      await tx.meeting_archive_items.deleteMany({
        where: {
          OR: [
            ...(meetingIds.length ? [{ meeting_id: { in: meetingIds } }] : []),
            ...(folderIds.length ? [{ folder_id: { in: folderIds } }] : []),
          ],
        },
      });
      if (meetingIds.length > 0) {
        await tx.meeting_referrals.deleteMany({
          where: { meeting_id: { in: meetingIds } },
        });
        await tx.meeting_attendees.deleteMany({
          where: { meeting_id: { in: meetingIds } },
        });
        await tx.meetings.deleteMany({ where: { id: { in: meetingIds } } });
      }
    }

    if (folderIds.length > 0) {
      const childIds = folderRows
        .filter((folder) => folder.parent_id !== null)
        .map((folder) => folder.id);
      const rootIds = folderRows
        .filter((folder) => folder.parent_id === null)
        .map((folder) => folder.id);

      if (childIds.length > 0) {
        await tx.letter_archive_folders.deleteMany({
          where: { id: { in: childIds } },
        });
      }

      if (rootIds.length > 0) {
        await tx.letter_archive_folders.deleteMany({
          where: { id: { in: rootIds } },
        });
      }
    }

      if (fileIds.length > 0) {
        await tx.files.deleteMany({ where: { id: { in: fileIds } } });
      }

      if (options.deleteSampleUsers) {
        const sampleUsers = await tx.users.findMany({
          where: sampleUserWhere(),
          select: { id: true },
        });
        const sampleUserIds = sampleUsers.map((user) => user.id);

        if (sampleUserIds.length > 0) {
          await tx.users_permissions.deleteMany({
            where: { user_id: { in: sampleUserIds } },
          });
          await tx.persons.deleteMany({
            where: { user_id: { in: sampleUserIds } },
          });
          await tx.users.deleteMany({
            where: { id: { in: sampleUserIds } },
          });
        }

        const sampleRole = await tx.roles.findFirst({
          where: { title: SAMPLE_ROLE_TITLE },
          select: { id: true },
        });

        if (sampleRole) {
          await tx.roles_permissions.deleteMany({
            where: { role_id: sampleRole.id },
          });
          await tx.roles.delete({ where: { id: sampleRole.id } });
        }
      }
    },
    { timeout: 60_000 }
  );

  await removeStoredFiles(fileRows.map((file) => file.file_name));

  return {
    ...before,
    sampleUsers: options.deleteSampleUsers ? before.sampleUsers : 0,
  };
}

export async function removeAllSampleData(): Promise<SampleDataStats> {
  return deleteSampleContent({ deleteSampleUsers: true });
}

export async function seedSampleData(
  currentUser: CurrentSeedUser,
  options: SampleDataSeedOptions
): Promise<SampleDataSeedSummary> {
  const normalized = normalizeOptions(options);
  const deleted = normalized.resetExisting ? await deleteSampleContent() : undefined;
  const runKey = buildRunKey();
  const contentProvider = await getSampleContentProvider();
  const created = {
    ...emptyStats(),
    sampleUsersCreated: 0,
    sampleUsersReused: 0,
    letterRelations: 0,
    letterAttachments: 0,
    formReferrals: 0,
    meetingReferrals: 0,
    messageRecipients: 0,
    archiveItems: 0,
  };
  const now = new Date();
  const subjects = await contentProvider.getSubjects(normalized.subjectCount);
  const samplePeople = await contentProvider.getPeople(normalized.sampleUserCount);
  const sampleUserIds: string[] = [];

  {
    const tx = prisma;
    const ensured = await ensureSampleUsers(tx, {
      creatorId: currentUser.id,
      people: samplePeople,
      userCount: normalized.sampleUserCount,
      password: normalized.sampleUserPassword,
    });
    const sampleUsers = ensured.users;

    created.sampleUsers = sampleUsers.length;
    created.sampleUsersCreated = ensured.created;
    created.sampleUsersReused = ensured.reused;
    sampleUserIds.push(...sampleUsers.map((user) => user.userId));

    const rootFolder = await tx.letter_archive_folders.create({
      data: {
        user_id: currentUser.id,
        parent_id: null,
        title: `${SAMPLE_DATA_MARKER} فضای نمونه هوش مصنوعی ${runKey}`,
        sort_order: 0,
        create_date: now,
        update_date: now,
      },
      select: { id: true },
    });
    created.archiveFolders += 1;

    for (const [subjectIndex, subject] of subjects.entries()) {
      const baseTitle = subjectPrefix(runKey, subject.title);
      const subjectFolder = await tx.letter_archive_folders.create({
        data: {
          user_id: currentUser.id,
          parent_id: rootFolder.id,
          title: `${baseTitle} - بایگانی`,
          sort_order: subjectIndex + 1,
          create_date: addHours(now, subjectIndex),
          update_date: addHours(now, subjectIndex),
        },
        select: { id: true },
      });
      created.archiveFolders += 1;

      const subjectLetters: Array<{ id: number; title: string }> = [];
      for (let letterIndex = 0; letterIndex < normalized.lettersPerSubject; letterIndex += 1) {
        const incomingForCurrentUser = letterIndex % 2 === 0;
        const sampleSender = sampleUsers[(subjectIndex + letterIndex) % sampleUsers.length];
        const sampleReceiver = sampleUsers[(subjectIndex + letterIndex + 1) % sampleUsers.length];
        const sampleObserver = sampleUsers[(subjectIndex + letterIndex + 2) % sampleUsers.length];
        const senderId = incomingForCurrentUser ? sampleSender.id : currentUser.id;
        const receiverIds = incomingForCurrentUser
          ? uniqueNumbers([currentUser.id, sampleReceiver.id])
          : uniqueNumbers([sampleReceiver.id, sampleObserver.id]);
        const letterContent = contentProvider.letter({
          subject,
          index: subjectIndex,
          itemNumber: letterIndex + 1,
        });
        const title = `${baseTitle} - ${letterContent.title}`;
        const issueDate = addDays(now, subjectIndex * -7 - letterIndex);
        const contents = htmlParagraphs([
          SAMPLE_DATA_MARKER,
          ...letterContent.bodyLines,
        ]);

        const letter = await tx.letters.create({
          data: {
            title,
            contents,
            create_date: issueDate,
            issue_date: issueDate,
            creator_id: senderId,
            sender_id: senderId,
            source_type: incomingForCurrentUser ? 2 : 1,
            classification: (letterIndex % 3) + 1,
            external_number: incomingForCurrentUser
              ? `شماره-خارجی-${runKey}-${subjectIndex + 1}-${letterIndex + 1}`
              : null,
          },
          select: { id: true },
        });

        await tx.letters.update({
          where: { id: letter.id },
          data: {
            internal_number: `نمونه-${runKey}-${subjectIndex + 1}-${letter.id}`,
          },
        });

        await tx.letter_recipients.createMany({
          data: receiverIds.map((userId) => ({
            letter_id: letter.id,
            user_id: userId,
          })),
        });

        const primaryReceiverId = incomingForCurrentUser
          ? currentUser.id
          : sampleReceiver.id;
        const referralRows = [
          {
            letter_id: letter.id,
            sender_id: senderId,
            receiver_id: primaryReceiverId,
            date_time: issueDate,
            contents: htmlParagraphs([
              SAMPLE_DATA_MARKER,
              ...letterContent.primaryReferralLines,
            ]),
            due_date: addDays(issueDate, 4 + letterIndex),
            status:
              letterIndex === normalized.lettersPerSubject - 1
                ? REFERRAL_DONE
                : REFERRAL_OPEN,
            read_at:
              incomingForCurrentUser && letterIndex % 3 === 0
                ? null
                : addHours(issueDate, 2),
          },
          {
            letter_id: letter.id,
            sender_id: primaryReceiverId,
            receiver_id: sampleObserver.id,
            date_time: addHours(issueDate, 3),
            contents: htmlParagraphs([
              SAMPLE_DATA_MARKER,
              ...letterContent.secondaryReferralLines,
            ]),
            due_date: addDays(issueDate, 7),
            status: REFERRAL_OPEN,
            read_at: null,
          },
        ];

        await tx.letter_referrals.createMany({ data: referralRows });

        if (letterIndex === 0 || letterIndex === normalized.lettersPerSubject - 1) {
          const file = await createStoredFile(tx, {
            creatorId: senderId,
            title: `${SAMPLE_DATA_MARKER} ${letterContent.attachmentTitle}`,
            content: Buffer.from(
              [SAMPLE_DATA_MARKER, ...letterContent.attachmentLines].join("\n"),
              "utf8"
            ),
          });

          created.files += 1;
          created.letterAttachments += 1;
          await tx.letter_attachments.create({
            data: { letter_id: letter.id, file_id: file.id },
          });
        }

        subjectLetters.push({ id: letter.id, title });
        created.letters += 1;
      }

      for (let index = 1; index < subjectLetters.length; index += 1) {
        await tx.letter_related_letters.create({
          data: {
            main_letter_id: subjectLetters[index - 1].id,
            related_letter_id: subjectLetters[index].id,
          },
        });
        created.letterRelations += 1;
      }

      if (subjectLetters.length > 2) {
        await tx.letter_related_letters.create({
          data: {
            main_letter_id: subjectLetters[0].id,
            related_letter_id: subjectLetters[2].id,
          },
        });
        created.letterRelations += 1;
      }

      const approvers = uniqueNumbers([
        sampleUsers[subjectIndex % sampleUsers.length].id,
        currentUser.id,
        sampleUsers[(subjectIndex + 1) % sampleUsers.length].id,
      ]);
      const formTemplateContent = contentProvider.formTemplate({
        subject,
        index: subjectIndex,
      });
      const templateFile = await createStoredFile(tx, {
        creatorId: currentUser.id,
        title: `${SAMPLE_DATA_MARKER} ${formTemplateContent.title}.docx`,
        content: buildDocxBuffer(`${baseTitle} - ${formTemplateContent.title}`, [
          SAMPLE_DATA_MARKER,
          ...formTemplateContent.documentLines,
        ]),
      });
      created.files += 1;

      const template = await tx.form_templates.create({
        data: {
          title: `${baseTitle} - ${formTemplateContent.title}`,
          description: `${SAMPLE_DATA_MARKER} ${formTemplateContent.description}`,
          template_file_id: templateFile.id,
          is_active: true,
          is_deleted: false,
          create_date: addHours(now, subjectIndex),
          creator_id: currentUser.id,
        },
        select: { id: true },
      });
      created.formTemplates += 1;

      await tx.form_process_steps.createMany({
        data: approvers.map((approverId, index) => ({
          template_id: template.id,
          step_order: index + 1,
          title: formTemplateContent.stepTitle(index + 1),
          approver_user_id: approverId,
        })),
      });

      for (let formIndex = 0; formIndex < normalized.formsPerSubject; formIndex += 1) {
        const mode = formIndex % 4;
        const formContent = contentProvider.formInstance({
          subject,
          index: subjectIndex,
          itemNumber: formIndex + 1,
          statusMode: mode,
        });
        const creatorId = formIndex % 2 === 0 ? currentUser.id : sampleUsers[subjectIndex % sampleUsers.length].id;
        const createDate = addDays(now, subjectIndex * -5 - formIndex);
        const submitDate = mode === 0 ? null : addHours(createDate, 2);
        const activeOrder = mode === 1 ? 2 : null;
        const instanceStatus =
          mode === 0
            ? FORM_STATUS_DRAFT
            : mode === 1
              ? FORM_STATUS_IN_PROGRESS
              : mode === 2
                ? FORM_STATUS_COMPLETED
                : FORM_STATUS_REJECTED;
        const instanceFile = await createStoredFile(tx, {
          creatorId,
          title: `${SAMPLE_DATA_MARKER} ${formContent.documentTitle}.docx`,
          content: buildDocxBuffer(`${baseTitle} - ${formContent.documentTitle}`, [
            SAMPLE_DATA_MARKER,
            ...formContent.documentLines,
          ]),
        });
        created.files += 1;

        const instance = await tx.form_instances.create({
          data: {
            template_id: template.id,
            title: `${baseTitle} - ${formContent.title}`,
            creator_id: creatorId,
            current_file_id: instanceFile.id,
            status: instanceStatus,
            current_step_order: activeOrder,
            create_date: createDate,
            submit_date: submitDate,
            complete_date: mode === 2 ? addDays(createDate, 2) : null,
            reject_date: mode === 3 ? addDays(createDate, 2) : null,
          },
          select: { id: true },
        });
        created.formInstances += 1;

        for (const [stepIndex, approverId] of approvers.entries()) {
          const stepOrder = stepIndex + 1;
          let status = FORM_STEP_PENDING;
          let actionDate: Date | null = null;
          let comments: string | null = null;

          if (mode === 1) {
            status =
              stepOrder < 2
                ? FORM_STEP_APPROVED
                : stepOrder === 2
                  ? FORM_STEP_ACTIVE
                  : FORM_STEP_PENDING;
            actionDate = stepOrder < 2 ? addHours(createDate, 5) : null;
            comments = stepOrder < 2 ? formContent.approvedComment : null;
          } else if (mode === 2) {
            status = FORM_STEP_APPROVED;
            actionDate = addDays(createDate, stepOrder);
            comments = formContent.approvedComment;
          } else if (mode === 3) {
            status = stepOrder === 2 ? FORM_STEP_REJECTED : FORM_STEP_APPROVED;
            actionDate = stepOrder <= 2 ? addDays(createDate, stepOrder) : null;
            comments =
              stepOrder === 2
                ? formContent.rejectedComment
                : formContent.approvedComment;
          }

          await tx.form_instance_steps.create({
            data: {
              instance_id: instance.id,
              step_order: stepOrder,
              title: formTemplateContent.stepTitle(stepOrder),
              approver_user_id: approverId,
              status,
              action_date: actionDate,
              comments,
            },
          });
        }

        if (mode === 1) {
          await tx.form_referrals.createMany({
            data: [
              {
                instance_id: instance.id,
                sender_id: creatorId,
                receiver_id: approvers[0],
                date_time: submitDate,
                contents: `${SAMPLE_DATA_MARKER} ${formContent.submitReferral}`,
                status: REFERRAL_DONE,
                read_at: addHours(createDate, 4),
              },
              {
                instance_id: instance.id,
                sender_id: approvers[0],
                receiver_id: currentUser.id,
                date_time: addHours(createDate, 6),
                contents: `${SAMPLE_DATA_MARKER} ${formContent.activeReferral}`,
                status: REFERRAL_OPEN,
                read_at: null,
              },
            ],
          });
          created.formReferrals += 2;
        } else if (mode > 1) {
          await tx.form_referrals.create({
            data: {
              instance_id: instance.id,
              sender_id: approvers[0],
              receiver_id: creatorId,
              date_time: addHours(createDate, 8),
              contents:
                mode === 2
                  ? `${SAMPLE_DATA_MARKER} ${formContent.completedReferral}`
                  : `${SAMPLE_DATA_MARKER} ${formContent.rejectedReferral}`,
              status: mode === 2 ? REFERRAL_DONE : REFERRAL_OPEN,
              read_at: mode === 2 ? addHours(createDate, 10) : null,
            },
          });
          created.formReferrals += 1;
        }

        if (normalized.archiveSamples && mode === 2) {
          await tx.form_archive_items.create({
            data: {
              user_id: currentUser.id,
              folder_id: subjectFolder.id,
              form_instance_id: instance.id,
              create_date: addDays(createDate, 3),
              update_date: addDays(createDate, 3),
            },
          });
          created.archiveItems += 1;
        }
      }

      for (let meetingIndex = 0; meetingIndex < normalized.meetingsPerSubject; meetingIndex += 1) {
        const meetingContent = contentProvider.meeting({
          subject,
          index: subjectIndex,
          itemNumber: meetingIndex + 1,
          runKey,
        });
        const creatorId =
          meetingIndex % 2 === 0
            ? sampleUsers[(subjectIndex + meetingIndex) % sampleUsers.length].id
            : currentUser.id;
        const chairId =
          meetingIndex % 2 === 0
            ? currentUser.id
            : sampleUsers[(subjectIndex + 1) % sampleUsers.length].id;
        const secretaryId = sampleUsers[(subjectIndex + 2) % sampleUsers.length].id;
        const attendeeIds = uniqueNumbers([
          currentUser.id,
          chairId,
          secretaryId,
          sampleUsers[(subjectIndex + 3) % sampleUsers.length].id,
          sampleUsers[(subjectIndex + 4) % sampleUsers.length].id,
        ]);
        const meetingAt = addDays(now, meetingIndex % 2 === 0 ? 3 + subjectIndex : -3 - subjectIndex);
        const approved = meetingIndex % 3 === 1;

        const meeting = await tx.meetings.create({
          data: {
            title: `${baseTitle} - ${meetingContent.title}`,
            description: htmlParagraphs([
              SAMPLE_DATA_MARKER,
              ...meetingContent.descriptionLines,
            ]),
            location_type: meetingIndex % 2,
            location_title:
              meetingIndex % 2 === 0
                ? meetingContent.physicalLocation
                : meetingContent.onlineLocation,
            meeting_at: meetingAt,
            minutes: htmlParagraphs([
              SAMPLE_DATA_MARKER,
              ...meetingContent.minutesLines,
            ]),
            creator_id: creatorId,
            chair_user_id: chairId,
            secretary_user_id: secretaryId,
            approval_status: approved
              ? MEETING_APPROVAL_APPROVED
              : MEETING_APPROVAL_PENDING,
            approved_at: approved ? addHours(meetingAt, 2) : null,
            create_date: addDays(meetingAt, -2),
          },
          select: { id: true },
        });
        created.meetings += 1;

        await tx.meeting_attendees.createMany({
          data: attendeeIds.map((userId) => ({
            meeting_id: meeting.id,
            user_id: userId,
            role:
              userId === chairId
                ? ATTENDEE_CHAIR
                : userId === secretaryId
                  ? ATTENDEE_SECRETARY
                  : ATTENDEE_MEMBER,
          })),
        });

        const meetingReferralRows = attendeeIds.map((receiverId, index) => ({
          meeting_id: meeting.id,
          sender_id: creatorId,
          receiver_id: receiverId,
          date_time: addDays(meetingAt, -1),
          contents:
            receiverId === currentUser.id
              ? `${SAMPLE_DATA_MARKER} ${meetingContent.ownReferral}`
              : `${SAMPLE_DATA_MARKER} ${meetingContent.attendeeReferral}`,
          status:
            receiverId === currentUser.id && meetingIndex % 2 === 0
              ? REFERRAL_OPEN
              : index % 3 === 0
                ? REFERRAL_DONE
                : REFERRAL_OPEN,
          read_at:
            receiverId === currentUser.id && meetingIndex % 2 === 0
              ? null
              : addHours(meetingAt, -20),
        }));

        await tx.meeting_referrals.createMany({ data: meetingReferralRows });
        created.meetingReferrals += meetingReferralRows.length;

        if (normalized.archiveSamples && approved) {
          await tx.meeting_archive_items.create({
            data: {
              user_id: currentUser.id,
              folder_id: subjectFolder.id,
              meeting_id: meeting.id,
              create_date: addHours(meetingAt, 4),
              update_date: addHours(meetingAt, 4),
            },
          });
          created.archiveItems += 1;
        }
      }

      for (let threadIndex = 0; threadIndex < normalized.messageThreadsPerSubject; threadIndex += 1) {
        const messageContent = contentProvider.messageThread({
          subject,
          index: subjectIndex,
          itemNumber: threadIndex + 1,
        });
        const senderIsCurrentUser = threadIndex % 2 === 0;
        const senderId = senderIsCurrentUser
          ? currentUser.id
          : sampleUsers[(subjectIndex + threadIndex) % sampleUsers.length].id;
        const recipients = senderIsCurrentUser
          ? uniqueNumbers([
              sampleUsers[(subjectIndex + threadIndex + 1) % sampleUsers.length].id,
              sampleUsers[(subjectIndex + threadIndex + 2) % sampleUsers.length].id,
            ])
          : [currentUser.id];
        const messageDate = addDays(now, subjectIndex * -4 - threadIndex);
        const rootMessage = await tx.messages.create({
          data: {
            title: `${baseTitle} - ${messageContent.title}`,
            contents: htmlParagraphs([
              SAMPLE_DATA_MARKER,
              ...messageContent.bodyLines,
            ]),
            importance: (threadIndex % 3) + 1,
            sender_id: senderId,
            create_date: messageDate,
          },
          select: { id: true },
        });
        created.messages += 1;

        await tx.message_recipients.createMany({
          data: recipients.map((receiverId, index) => ({
            message_id: rootMessage.id,
            user_id: receiverId,
            read_at:
              receiverId === currentUser.id && threadIndex % 2 === 1
                ? null
                : addHours(messageDate, 3 + index),
            read_notification_seen_at: index % 2 === 0 ? null : addHours(messageDate, 4),
          })),
        });
        created.messageRecipients += recipients.length;

        const replySenderId = recipients[0];
        const replyReceiverId = senderId;
        const replyMessage = await tx.messages.create({
          data: {
            title: `${baseTitle} - ${messageContent.replyTitle}`,
            contents: htmlParagraphs([
              SAMPLE_DATA_MARKER,
              ...messageContent.replyLines,
            ]),
            importance: threadIndex % 2 === 0 ? 2 : 1,
            sender_id: replySenderId,
            parent_message_id: rootMessage.id,
            create_date: addHours(messageDate, 5),
          },
          select: { id: true },
        });
        created.messages += 1;

        await tx.message_recipients.create({
          data: {
            message_id: replyMessage.id,
            user_id: replyReceiverId,
            read_at: replyReceiverId === currentUser.id ? null : addHours(messageDate, 6),
          },
        });
        created.messageRecipients += 1;

        if (threadIndex % 2 === 0) {
          const forwardedMessage = await tx.messages.create({
            data: {
              title: `${baseTitle} - ${messageContent.forwardTitle}`,
              contents: htmlParagraphs([
                SAMPLE_DATA_MARKER,
                ...messageContent.forwardLines,
              ]),
              importance: 3,
              sender_id: currentUser.id,
              forwarded_from_message_id: rootMessage.id,
              create_date: addHours(messageDate, 8),
            },
            select: { id: true },
          });
          created.messages += 1;

          await tx.message_recipients.create({
            data: {
              message_id: forwardedMessage.id,
              user_id: sampleUsers[(subjectIndex + 3) % sampleUsers.length].id,
            },
          });
          created.messageRecipients += 1;
        }
      }

      if (normalized.archiveSamples && subjectLetters.length > 0) {
        const archivedLetter = subjectLetters[subjectLetters.length - 1];
        await tx.letter_archive_items.create({
          data: {
            user_id: currentUser.id,
            folder_id: subjectFolder.id,
            letter_id: archivedLetter.id,
            create_date: addDays(now, subjectIndex * -2),
            update_date: addDays(now, subjectIndex * -2),
          },
        });
        created.archiveItems += 1;
      }
    }
  }

  return {
    runKey,
    marker: SAMPLE_DATA_MARKER,
    contentSource: contentProvider.label,
    deleted,
    created,
    sampleUserIds,
    sampleUserPassword: normalized.sampleUserPassword,
  };
}
