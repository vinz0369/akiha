import { LoginForm } from "@/features/auth/login-form";
import { FlowerIcon, HeartIcon } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <main className="app-canvas relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-x-hidden overflow-y-auto border-x border-white/70 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-ink shadow-2xl">
      <div className="absolute -right-20 -top-16 size-72 rounded-full bg-primary/35 blur-3xl" aria-hidden="true" />
      <div className="absolute -left-20 top-1/3 size-56 rounded-full bg-lavender/80 blur-3xl" aria-hidden="true" />
      <FlowerIcon className="absolute right-7 top-[15%] size-14 rotate-12 text-primary-strong/20" />
      <div className="relative flex min-h-[270px] flex-1 flex-col justify-center pb-6">
        <div className="grid size-14 place-items-center rounded-[20px] bg-[linear-gradient(145deg,var(--ink),#70425a)] text-white shadow-[0_16px_36px_rgb(75_48_58_/_0.22)]" aria-hidden="true">
          <HeartIcon className="size-7" />
        </div>
        <p className="eyebrow mt-6">Nhật ký của hai đứa</p>
        <h1 className="mt-1 text-5xl font-black tracking-[-.055em]">akiha<span className="text-primary-strong">.</span></h1>
        <p className="mt-3 max-w-[300px] text-base leading-relaxed text-muted">Một góc nhỏ, hiện đại và thật riêng để lưu lại những ngày em đã chọn xuất hiện.</p>
      </div>
      <LoginForm />
      <p className="mt-4 text-center text-xs font-semibold text-muted">Riêng tư · Chỉ Thu và Vinh</p>
    </main>
  );
}
