import assert from "node:assert/strict";
import test from "node:test";
import {
  isRecord,
  parseInteger,
  parseJsonArray,
  parsePositiveInteger,
} from "../src/lib/input.ts";
import { getPlainText, hasRichTextContent } from "../src/lib/richText.ts";
import { normalizeSearchValue, toLatinDigits } from "../src/lib/text.ts";
import { getUserDisplayName } from "../src/lib/userDisplay.ts";
import {
  getSafeInternalPath,
  setInternalPathQuery,
} from "../src/lib/navigation.ts";

test("parsePositiveInteger rejects ambiguous and unsafe values", () => {
  assert.equal(parseInteger("0"), 0);
  assert.equal(parsePositiveInteger("42"), 42);
  assert.equal(parsePositiveInteger(7), 7);
  assert.equal(parsePositiveInteger(""), null);
  assert.equal(parsePositiveInteger("1.5"), null);
  assert.equal(parsePositiveInteger(-1), null);
  assert.equal(parsePositiveInteger(true), null);
  assert.equal(parsePositiveInteger(Number.MAX_SAFE_INTEGER + 1), null);
});

test("JSON arrays are accepted only when every entry matches", () => {
  const isIdRecord = (value) =>
    isRecord(value) && parsePositiveInteger(value.id) !== null;

  assert.deepEqual(parseJsonArray('[{"id":1}]', isIdRecord), [{ id: 1 }]);
  assert.equal(parseJsonArray('[{"id":0}]', isIdRecord), null);
  assert.equal(parseJsonArray('{"id":1}', isIdRecord), null);
  assert.equal(parseJsonArray("not-json", isIdRecord), null);
});

test("Persian text helpers normalize digits and search values", () => {
  assert.equal(toLatinDigits("۱۲۳٤٥"), "12345");
  assert.equal(normalizeSearchValue("  نمونه TEST  "), "نمونه test");
});

test("rich text helpers remove markup and preserve meaningful media", () => {
  assert.equal(getPlainText("<p>Hello&nbsp;<strong>world</strong></p>"), "Hello world");
  assert.equal(hasRichTextContent("<p>  </p>"), false);
  assert.equal(hasRichTextContent('<img src="example.png">'), true);
});

test("display names consistently include names, roles, and fallbacks", () => {
  assert.equal(
    getUserDisplayName({
      id: 4,
      user_id: "operator",
      persons_persons_user_idTousers: [
        { first_name: "علی", last_name: "رضایی", job: "کارشناس" },
      ],
    }),
    "علی رضایی - کارشناس",
  );
  assert.equal(getUserDisplayName({ id: 4, user_id: null }), "User #4");
});

test("post-login redirects stay inside the application", () => {
  assert.equal(getSafeInternalPath("/letter?id=8"), "/letter?id=8");
  assert.equal(getSafeInternalPath("https://example.com"), "/");
  assert.equal(getSafeInternalPath("//example.com"), "/");
  assert.equal(getSafeInternalPath("/signin?next=/profile"), "/");
  assert.equal(
    setInternalPathQuery("/letter?id=8", "brief", "login"),
    "/letter?id=8&brief=login",
  );
});
