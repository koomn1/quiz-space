import React from 'react';


interface SocialSupportLinksProps {
  github?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  isAr?: boolean;
}

export function SocialSupportLinks({ github, instagram, linkedin, facebook, isAr = true }: SocialSupportLinksProps) {
  // If no links are available, show a friendly status note to guide the profile owner or visitors
  const hasAnyLinks = !!(github || instagram || linkedin || facebook);

  const socialLinks = [
    { id: 'github', url: github, icon: 'fab fa-github', name: 'GitHub', color: 'hover:bg-[#171515] hover:border-[#171515] hover:shadow-[#171515]/30' },
    { id: 'instagram', url: instagram, icon: 'fab fa-instagram', name: 'Instagram', color: 'hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:border-[#dc2743] hover:shadow-[#dc2743]/30' },
    { id: 'linkedin', url: linkedin, icon: 'fab fa-linkedin-in', name: 'LinkedIn', color: 'hover:bg-[#0077b5] hover:border-[#0077b5] hover:shadow-[#0077b5]/30' },
    { id: 'facebook', url: facebook, icon: 'fab fa-facebook-f', name: 'Facebook', color: 'hover:bg-[#1877f2] hover:border-[#1877f2] hover:shadow-[#1877f2]/30' },
  ].filter(link => link.url);

  return (
    <>
      {typeof window !== 'undefined' && !document.getElementById('font-awesome-css') && (
         <link id="font-awesome-css" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      )}

      <div className="flex justify-center items-center gap-4 py-2 flex-wrap">
        {hasAnyLinks ? (
          socialLinks.map((link, index) => (
            <a
              
              href={link.url?.startsWith('http') ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
              
              
              
              className={`relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-all duration-300 shadow-sm hover:shadow-xl hover:text-white group ${link.color}`}
            >
              <i className={`${link.icon} text-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12`}></i>
              
              {/* Modern Tooltip */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 pointer-events-none z-50">
                <div className="bg-slate-900 dark:bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-white/10 relative">
                  {link.name}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900 dark:bg-black rotate-45 border-r border-b border-white/10"></div>
                </div>
              </div>
            </a>
          ))
        ) : (
          <div className="w-full text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-3 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            {isAr 
              ? 'لم يقم هذا العضو بإضافة روابط السوشيال ميديا بعد.' 
              : 'This member hasn\'t added social links yet.'}
          </div>
        )}
      </div>
    </>
  );
}
