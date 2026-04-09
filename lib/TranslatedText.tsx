import React, { useState, useEffect } from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { usePreferences } from './PreferencesContext';

// Simple global memory cache to prevent spamming Google Translate Endpoint
const cache: Record<string, string> = {};

export function TranslatedText({ children, ...props }: any) {
  const { language } = usePreferences();
  
  // Deepfake and Dashboards sometimes have nested arrays of text, we flatten it if it's pure
  const isTranslatable = 
    typeof children === 'string' || 
    typeof children === 'number' || 
    (Array.isArray(children) && children.every(c => typeof c === 'string' || typeof c === 'number'));
    
  const textStr = isTranslatable ? (Array.isArray(children) ? children.join('') : String(children)) : '';
  const [translated, setTranslated] = useState(textStr);

  useEffect(() => {
    if (!isTranslatable || !textStr.trim() || language === 'en') {
      if (isTranslatable) setTranslated(textStr);
      return;
    }

    // Convert Chinese code because Google expects 'zh-CN' and our dict is identical
    const gLang = language === 'zh' ? 'zh-CN' : language;
    const key = `${gLang}:${textStr}`;

    if (cache[key]) {
      setTranslated(cache[key]);
      return;
    }

    // Google Translate Free Public Endpoint used for hackathons
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${gLang}&dt=t&q=${encodeURIComponent(textStr)}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
         if (data && data[0]) {
           const res = data[0].map((x: any) => x[0]).join('');
           cache[key] = res;
           setTranslated(res);
         }
      })
      .catch((e) => {
         console.warn("[CivixShield AI Translate] Network fail or rate limit:", e.message);
         setTranslated(textStr);
      });
  }, [children, language, isTranslatable, textStr]);

  if (!isTranslatable) {
     return <RNText {...props}>{children}</RNText>;
  }

  return <RNText {...props}>{translated || textStr}</RNText>;
}
