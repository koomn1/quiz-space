import React from 'react';
import { profileAssetUrl } from '../../constants/profileAssets';
import ProfileAvatar from '../ProfileAvatar';

export const COSMO_AVATAR = profileAssetUrl('avatars/cosmo-cartoon.webp');

export function AssistantAvatar({ size = 40 }: { size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="relative w-full h-full rounded-full flex items-center justify-center p-0.5 border-2 border-[#2AC3BB]/60 shadow-lg shadow-[#007472]/25 ring-2 ring-[#2AC3BB]/20 bg-slate-900">
        <ProfileAvatar
          src={COSMO_AVATAR}
          alt="Cosmo AI"
          fallback="C"
          className="w-full h-full rounded-full overflow-hidden"
          imageClassName="w-full h-full object-cover"
          fallbackClassName="text-sm font-black text-[#2AC3BB]"
        />
      </div>
      <span
        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full shadow-sm"
        title="متصل"
        aria-label="Online status"
      />
    </div>
  );
}

export default AssistantAvatar;
