import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Plus, Search, Trash2 } from "lucide-react";
import {
  Alert,
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageFrame,
  PageHeader,
  PageTitle,
  Select,
  Surface,
  Textarea,
} from "@/src/components/ui";

export const metadata: Metadata = {
  title: "راهنمای رابط کاربری | میزکار",
};

export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PageFrame className="space-y-5">
      <PageHeader>
        <PageTitle
          eyebrow="راهنمای توسعه"
          title="سیستم رابط کاربری میزکار"
          description="مرجع زنده اندازه‌ها، حالت‌ها و اجزای مشترک برنامه"
        />
      </PageHeader>

      <Surface>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">دکمه‌ها</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button leadingIcon={<Plus className="h-4 w-4" />}>عملیات اصلی</Button>
          <Button variant="secondary">عملیات ثانویه</Button>
          <Button variant="ghost">عملیات کم‌اهمیت</Button>
          <Button variant="success" leadingIcon={<CheckCircle2 className="h-4 w-4" />}>
            تایید
          </Button>
          <Button variant="danger" leadingIcon={<Trash2 className="h-4 w-4" />}>
            حذف
          </Button>
          <Button disabled>غیرفعال</Button>
          <Button loading loadingLabel="در حال پردازش">پردازش</Button>
          <IconButton variant="secondary" aria-label="جستجو">
            <Search className="h-4 w-4" />
          </IconButton>
        </div>
      </Surface>

      <Surface>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">فرم‌ها</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <Field label="عنوان" htmlFor="ui-title" required hint="یک عنوان کوتاه و روشن وارد کنید.">
            <Input id="ui-title" placeholder="عنوان نمونه" />
          </Field>
          <Field label="نوع" htmlFor="ui-type">
            <Select id="ui-type" defaultValue="letter">
              <option value="letter">نامه</option>
              <option value="message">پیام</option>
              <option value="meeting">جلسه</option>
            </Select>
          </Field>
          <Field label="توضیحات" htmlFor="ui-description" className="md:col-span-2">
            <Textarea id="ui-description" placeholder="توضیحات نمونه" />
          </Field>
        </div>
      </Surface>

      <Surface>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">پیام‌های وضعیت</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Alert tone="info">اطلاعات تکمیلی برای کاربر</Alert>
          <Alert tone="success">عملیات با موفقیت انجام شد.</Alert>
          <Alert tone="warning">این عملیات نیاز به بررسی دارد.</Alert>
          <Alert tone="error">انجام عملیات ممکن نبود.</Alert>
        </div>
      </Surface>

      <EmptyState
        title="موردی برای نمایش وجود ندارد"
        description="پس از ایجاد اولین مورد، اطلاعات آن در این بخش نمایش داده می‌شود."
        action={<Button leadingIcon={<Plus className="h-4 w-4" />}>ایجاد مورد</Button>}
      />
    </PageFrame>
  );
}
