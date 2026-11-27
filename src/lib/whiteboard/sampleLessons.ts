import { validateLesson, type WhiteboardLesson } from './lessonSchema';

// Written by hand for QuizSpace (original content).
const raw = {
  schema_version: 1,
  id: 'sample-fractions-addition',
  title: 'جمع الكسور المتشابهة',
  lang: 'ar',
  metadata: { source: 'sample', status: 'reviewed' },
  steps: [
    {
      id: 's1',
      title: 'ما هو الكسر؟',
      narration: 'الكسر يعبّر عن جزء من كل. العدد العلوي يسمى البسط، والعدد السفلي يسمى المقام، وهو يخبرنا إلى كم جزء متساوٍ قسمنا الشيء.',
      nodes: [
        { id: 'a', type: 'text', x: 640, y: 90, text: 'الكسر = جزء من كل', fontSize: 52, color: 'primary', align: 'center' },
        { id: 'b', type: 'text', x: 1080, y: 300, text: '3', fontSize: 110, color: 'accent', align: 'center' },
        { id: 'c', type: 'line', x: 1010, y: 340, x2: 1150, y2: 340, color: 'ink' },
        { id: 'd', type: 'text', x: 1080, y: 460, text: '4', fontSize: 110, color: 'primary', align: 'center' },
        { id: 'e', type: 'arrow', x: 960, y: 270, x2: 880, y2: 270, color: 'accent' },
        { id: 'f', type: 'text', x: 860, y: 285, text: 'البسط: عدد الأجزاء المأخوذة', fontSize: 36, color: 'accent', align: 'start' },
        { id: 'g', type: 'arrow', x: 960, y: 440, x2: 880, y2: 440, color: 'primary' },
        { id: 'h', type: 'text', x: 860, y: 455, text: 'المقام: عدد الأجزاء الكلي', fontSize: 36, color: 'primary', align: 'start' },
      ],
    },
    {
      id: 's2',
      title: 'نرسم المثال',
      narration: 'لنرسم شريطًا مقسومًا إلى أربعة أجزاء متساوية. نلوّن ثلاثة أجزاء، فيكون الكسر ثلاثة أرباع.',
      nodes: [
        { id: 'a', type: 'rectangle', x: 240, y: 200, w: 200, h: 120, color: 'ink' },
        { id: 'b', type: 'rectangle', x: 440, y: 200, w: 200, h: 120, color: 'ink' },
        { id: 'c', type: 'rectangle', x: 640, y: 200, w: 200, h: 120, color: 'ink' },
        { id: 'd', type: 'rectangle', x: 840, y: 200, w: 200, h: 120, color: 'ink' },
        { id: 'e', type: 'highlight', x: 240, y: 200, w: 600, h: 120, color: 'accent' },
        { id: 'f', type: 'text', x: 640, y: 440, text: 'ثلاثة أرباع = 3/4', fontSize: 56, color: 'accent', align: 'center' },
      ],
    },
    {
      id: 's3',
      title: 'نجمع كسرين لهما المقام نفسه',
      narration: 'عندما يكون المقام واحدًا في الكسرين، نجمع البسطين فقط ونُبقي المقام كما هو. اثنان على خمسة زائد واحد على خمسة يساوي ثلاثة على خمسة.',
      nodes: [
        { id: 'a', type: 'text', x: 640, y: 90, text: 'نجمع البسطين ونُبقي المقام', fontSize: 48, color: 'primary', align: 'center' },
        { id: 'b', type: 'text', x: 240, y: 330, text: '2/5', fontSize: 100, color: 'accent', align: 'center' },
        { id: 'c', type: 'text', x: 440, y: 330, text: '+', fontSize: 100, color: 'ink', align: 'center' },
        { id: 'd', type: 'text', x: 640, y: 330, text: '1/5', fontSize: 100, color: 'accent', align: 'center' },
        { id: 'e', type: 'text', x: 840, y: 330, text: '=', fontSize: 100, color: 'ink', align: 'center' },
        { id: 'f', type: 'text', x: 1040, y: 330, text: '3/5', fontSize: 100, color: 'success', align: 'center' },
        { id: 'g', type: 'ellipse', x: 960, y: 220, w: 160, h: 140, color: 'success' },
      ],
    },
    {
      id: 's4',
      title: 'تذكّر',
      narration: 'تذكّر: لا نجمع المقامات أبدًا. المقام يبقى ثابتًا لأن حجم الأجزاء لم يتغير، نحن فقط نعدّ كم جزءًا لدينا.',
      nodes: [
        { id: 'a', type: 'text', x: 640, y: 160, text: 'لا نجمع المقامات!', fontSize: 64, color: 'danger', align: 'center' },
        { id: 'b', type: 'text', x: 640, y: 300, text: '2/5 + 1/5 ≠ 3/10', fontSize: 64, color: 'danger', align: 'center' },
        { id: 'c', type: 'line', x: 380, y: 255, x2: 900, y2: 345, color: 'danger' },
        { id: 'd', type: 'text', x: 640, y: 470, text: 'الصحيح: 2/5 + 1/5 = 3/5', fontSize: 56, color: 'success', align: 'center' },
        { id: 'e', type: 'rectangle', x: 280, y: 400, w: 720, h: 100, color: 'success' },
      ],
    },
  ],
};

const result = validateLesson(raw);
if (!result.ok || !result.lesson) throw new Error('Built-in sample lesson is invalid: ' + result.errors.join('; '));

export const SAMPLE_LESSONS: WhiteboardLesson[] = [result.lesson];
