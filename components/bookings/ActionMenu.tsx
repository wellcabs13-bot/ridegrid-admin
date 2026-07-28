interface ActionMenuProps {
  bookingId: string;
}

export default function ActionMenu({ bookingId }: ActionMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-lg bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-700"
        onClick={() => console.log('Edit', bookingId)}
      >
        Edit
      </button>

      <button
        className="rounded-lg bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
        onClick={() => console.log('Delete', bookingId)}
      >
        Delete
      </button>
    </div>
  );
}
