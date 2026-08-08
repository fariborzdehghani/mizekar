"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/src/actions/authActions";
import { Alert, Button, Field, Input } from "@/src/components/ui";

const initialState: LoginState = {};

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Field label="نام کاربری" htmlFor="username" required>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          dir="ltr"
          className="text-left"
        />
      </Field>

      <Field label="رمز عبور" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="text-left"
        />
      </Field>

      {state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : null}

      <Button
        type="submit"
        block
        loading={pending}
        loadingLabel="در حال ورود..."
      >
        ورود
      </Button>
    </form>
  );
}
