"use client";

import { useActionState, useState } from "react";

import { HeartIcon } from "@/components/ui/icons";
import { login, type LoginState } from "@/features/auth/actions";

const initialState: LoginState = { message: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="glass-card relative space-y-4 rounded-[30px] p-5 text-ink sm:p-6">
      <div><p className="text-xl font-black tracking-[-.02em]">Chào em quay lại</p><p className="mt-1 text-sm text-muted">Đăng nhập để tiếp tục hành trình hôm nay.</p></div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="min-h-13 w-full rounded-2xl border px-4"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="password">
          Mật khẩu
        </label>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="min-h-13 w-full rounded-2xl border px-4 pr-16"
            id="password"
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-1 min-w-12 rounded-xl px-2 text-xs font-bold text-primary-strong hover:bg-primary-soft"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </div>
      {state.message ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        aria-busy={pending}
        className="primary-action w-full px-6 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Đang mở Akiha…" : <span className="inline-flex items-center justify-center gap-1.5">Vào Akiha <HeartIcon className="size-4" /></span>}
      </button>
    </form>
  );
}
