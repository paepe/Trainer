export default function handler(req: any, res: any) {
  const key = process.env.FCM_PRIVATE_KEY || '';
  res.status(200).json({
    hasKey: !!key,
    startsWith: key.substring(0, 40),
    endsWith: key.substring(key.length - 40),
    containsNewlines: key.includes('\n'),
    containsLiteralN: key.includes('\\n'),
    length: key.length,
  });
}
