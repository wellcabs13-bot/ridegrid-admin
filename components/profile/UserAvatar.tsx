'use client';

import Image from 'next/image';

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
      avatar: 'h-10 w-10',
      text: 'text-sm',
      status: 'h-2.5 w-2.5',
      image: 40,
    },
    md: {
      avatar: 'h-12 w-12',
      text: 'text-base',
      status: 'h-3 w-3',
      image: 48,
    },
    lg: {
      avatar: 'h-16 w-16',
      text: 'text-xl',
      status: 'h-4 w-4',
      image: 64,
    },
  };

  const currentSize = sizes[size];

  return (
    <div className="relative inline-flex">
      {image ? (
        <div
          className={`relative overflow-hidden rounded-full border-2 border-white shadow-md ${currentSize.avatar}`}
        >
          <Image
            src={image}
            alt={name}
            fill
            sizes={`${currentSize.image}px`}
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 font-bold text-white shadow-md ${currentSize.avatar} ${currentSize.text}`}
        >
          {initials}
        </div>
      )}

      {online && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500 ${currentSize.status}`}
        />
      )}
    </div>
  );
}