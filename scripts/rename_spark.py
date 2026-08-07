import os, re, glob

SRC = '/home/ubuntu/quiz-space/src'

# Arabic replacements (order matters: longer first)
AR_REPL = [
    ('سبارك كويز', 'كوزمو كويز'),
    ('المساعد سبارك الشخصي', 'المساعد كوزمو الشخصي'),
    ('المساعد سبارك', 'المساعد كوزمو'),
    ('سبارك بيفكر', 'كوزمو بيفكر'),
    ('مراسلة سبارك', 'مراسلة كوزمو'),
    ('والتحدث مع المساعد الذكي سبارك', 'والتحدث مع المساعد الذكي كوزمو'),
    ('الذكي سبارك لطلب', 'الذكي كوزمو لطلب'),
    ('تواصل مع المساعد الذكي سبارك', 'تواصل مع المساعد الذكي كوزمو'),
    ('جاري استدعاء سبارك', 'جاري استدعاء كوزمو'),
    ('اسأل سبارك لشرح', 'اسأل كوزمو لشرح'),
    ('شرح المعلم الذكي (سبارك)', 'شرح المعلم الذكي (كوزمو)'),
    ('استحضار سبارك', 'استحضار كوزمو'),
    ('شرح سبارك المعلم الرقمي', 'شرح كوزمو المعلم الرقمي'),
    ('شرح سبارك', 'شرح كوزمو'),
    ('اطلب من سبارك', 'اطلب من كوزمو'),
    ('ملاحظة سبارك', 'ملاحظة كوزمو'),
    ('بالذكاء الاصطناعي سبارك', 'بالذكاء الاصطناعي كوزمو'),
    ('سيقوم سبارك', 'سيقوم كوزمو'),
    ('يتيح لك سبارك', 'يتيح لك كوزمو'),
    ('المقترحة من سبارك', 'المقترحة من كوزمو'),
    ('وبدأ سبارك', 'وبدأ كوزمو'),
    ('خبرة سبارك المتراكمة', 'خبرة الكوزمو المتراكمة'),
    ('اختبارات سبارك الخاصة', 'اختبارات كوزمو الخاصة'),
    ('نقطة سبارك علمية', 'نقطة كوزمو علمية'),
    ('باستخدام سبارك', 'باستخدام كوزمو'),
    ('مرحباً بك في Quiz Space', ''),
    # generic remaining spark mentions
    ('سبارك', 'كوزمو'),
]

EN_REPL = [
    ('Spark Assistant', 'Cosmo Assistant'),
    ('spark assistant', 'Cosmo assistant'),
    ('Spark', 'Cosmo AI'),
    ('spark', 'cosmo ai'),
]

for path in glob.glob(SRC + '/**/*.{ts,tsx}', recursive=True) + glob.glob(SRC + '/**/*', recursive=True):
    if path.endswith(('.ts', '.tsx')):
        with open(path, encoding='utf-8') as f:
            content = f.read()
        orig = content
        # do not touch the assistant name constants in AIChat (already set)
        if 'AIChat.tsx' in path:
            for old, new in EN_REPL:
                if old == 'Spark' or old == 'spark':
                    continue
                content = content.replace(old, new)
        else:
            for old, new in AR_REPL:
                content = content.replace(old, new)
            for old, new in EN_REPL:
                content = content.replace(old, new)
        if content != orig:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print('updated', path)
print('done')
