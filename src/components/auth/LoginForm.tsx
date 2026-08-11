"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn, UserRound } from "lucide-react";
import { loginAction, type LoginState } from "@/src/actions/authActions";
import { Alert, Button, IconButton, Input } from "@/src/components/ui";

const initialState: LoginState = {};

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const errorId = state.error ? "login-error" : undefined;
  const passwordToggleLabel = showPassword
    ? "پنهان کردن رمز عبور"
    : "نمایش رمز عبور";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="ui-field">
        <label className="ui-field-label" htmlFor="username">
          نام کاربری
          <span className="ui-field-required" aria-hidden="true">
            *
          </span>
        </label>
        <div className="relative">
          <UserRound
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
          />
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            dir="ltr"
            aria-describedby={errorId}
            aria-invalid={Boolean(state.error)}
            className="pr-12 pl-4 text-left text-base sm:text-sm"
          />
        </div>
      </div>

      <div className="ui-field">
        <label className="ui-field-label" htmlFor="password">
          رمز عبور
          <span className="ui-field-required" aria-hidden="true">
            *
          </span>
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            dir="ltr"
            aria-describedby={errorId}
            aria-invalid={Boolean(state.error)}
            className="auth-password-input pr-12 pl-4 text-left text-base sm:text-sm"
          />
          <IconButton
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-0 top-0 z-10 text-gray-400 hover:text-brand-600 dark:hover:text-brand-300"
            aria-label={passwordToggleLabel}
            title={passwordToggleLabel}
            variant="ghost"
            size="lg"
          >
            {showPassword ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </IconButton>
        </div>
      </div>

      {state.error ? (
        <div id="login-error">
          <Alert tone="error">{state.error}</Alert>
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        block
        loading={pending}
        loadingLabel="در حال ورود..."
        leadingIcon={<LogIn className="h-[18px] w-[18px]" />}
        className="mt-1"
      >
        ورود به میزکار
      </Button>
    </form>
  );
}
