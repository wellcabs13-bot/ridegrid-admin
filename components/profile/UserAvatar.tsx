'use client';

interface UserAvatarProps {
  name: string;
  role?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

export default function UserAvatar({
  name,
  image,
  size = 'md',
  online = true,
}: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const sizes = {
    sm: {
      avatar: 'w-10 h-10',
      text: 'text-sm',
      status: 'w-2.5 h-2.5',
    },
    md: {
      avatar: 'w-12 h-12',
      text: 'text-base',
      status: 'w-3 h-3',
    },
    lg: {
      avatar: 'w-16 h-16',
      text: 'text-xl',
      status: 'w-4 h-4',
    },
  };

  return (
    <div className="relative">
      {image ? (
        <img
          src={image}
          alt={name}
          className={`${sizes[size].avatar} rounded-full object-cover border-2 border-white shadow-md`}
        />
      ) : (
        <div
          className={`${sizes[size].avatar} rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md ${sizes[size].text}`}
        >
          {initials}
        </div>
      )}

      {online && (
        <span
          className={`absolute bottom-0 right-0 ${sizes[size].status} rounded-full bg-emerald-500 border-2 border-white`}
        />
      )}
    </div>
  );
}