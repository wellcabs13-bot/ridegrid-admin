"use client";

import { FormEvent, useState } from "react";

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
}

interface Props {
  onSave: (data: CustomerFormData) => void;
  onCancel: () => void;
}

export default function CustomerForm({
  onSave,
  onCancel,
}: Props) {
  const [form, setForm] =
    useState<CustomerFormData>({
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      password: "",
    });

  function update(
    field: keyof CustomerFormData,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="First Name"
          value={form.firstName}
          onChange={(value) =>
            update("firstName", value)
          }
          required
        />

        <Input
          label="Last Name"
          value={form.lastName}
          onChange={(value) =>
            update("lastName", value)
          }
          required
        />

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(value) =>
            update("email", value)
          }
          required
        />

        <Input
          label="Mobile"
          value={form.mobile}
          onChange={(value) =>
            update("mobile", value)
          }
        />

        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(value) =>
            update("password", value)
          }
          required
        />
      </div>

      <div className="flex justify-end gap-3 border-t pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Create Customer
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-slate-500"
      />
    </label>
  );
}