import re, requests

# Chunk names listed in deployed index
chunks = [
    "index--RClVDRK.js", "AIChat-CRlQc0rN.js", "AdminDashboard-y4f6pZEi.js",
    "AnalyticsDashboard-Bu7AM0TS.js", "BillingSection-BIZslg0A.js",
    "Classrooms-C-UbQZOc.js", "MyQuizzes-BWrgWcxN.js", "QuizCreator-BqUzLnpm.js",
    "Support-CYO2YGd8.js", "UserProfile-DlBfClSy.js", "BarChart-Dfz6-Zoh.js",
    "html2canvas.esm-QH1iLAAe.js", "jspdf.es.min-DdxSvbn9.js",
    "encryption-SYyxsFkH.js", "megaphone-CP3E2iGM.js", "pen-BzMwbGQT.js",
    "plus-BsUSfR3P.js", "save-jKQAv6og.js",
]
for c in chunks:
    body = requests.get(f"https://quiz-space-app.pages.dev/assets/{c}").text
    avatars = sorted(set(re.findall(r'avatars/[a-z0-9.-]+\.(png|svg)', body)))
    up = body.count('userPhoto')
    pu = body.count('photo_url')
    if avatars or up or pu:
        print(f"{c}: avatars={avatars} userPhoto={up} photo_url={pu}")
