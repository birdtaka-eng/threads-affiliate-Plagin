export interface Template {
    id: string;
    category: string;
    name: string; // Using as 'Content' or 'Example'
    description: string; // Usage scene
}

// Hooks from the "Hook Example" Excel sheet
export const GOLDEN_TEMPLATES: Template[] = [
    // Problem Raising (問題提起型)
    { id: 'prob_1', category: '問題提起型', name: '〇〇なことありませんか？', description: '高額商品、検討中の人に刺さる' },
    { id: 'prob_2', category: '問題提起型', name: 'それは〇〇かもしれません', description: '見直し系商品全般' },
    { id: 'prob_3', category: '問題提起型', name: '〇〇だと思っていませんか？', description: '常識を覆す代替商品' },
    { id: 'prob_4', category: '問題提起型', name: 'みんな〇〇しています', description: '先行情報の提供' },

    // Data Appeal (データ訴求型)
    { id: 'data_1', category: 'データ訴求型', name: '2ヶ月で〇〇しました', description: 'ダイエット・ビフォーアフター' },
    { id: 'data_2', category: 'データ訴求型', name: '5年間使い続けています', description: '長期レビュー・耐久性' },
    { id: 'data_3', category: 'データ訴求型', name: '1日あたり〇〇円です', description: 'コスパ訴求・日割り計算' },
    { id: 'data_4', category: 'データ訴求型', name: '3時間で〇〇できました', description: '時短・効率化商品' },

    // Empathy (共感獲得型)
    { id: 'empathy_1', category: '共感獲得型', name: '〇〇で悩んでいました', description: '悩み解決・劇的変化' },
    { id: 'empathy_2', category: '共感獲得型', name: '誰にも言えなかったのですが', description: 'デリケートな悩み系' },
    { id: 'empathy_3', category: '共感獲得型', name: '同じ悩みを持つ人へ', description: '共感コミュニティ形成' },

    // Immediacy (今すぐ型)
    { id: 'now_1', category: '今すぐ型', name: '明日までです', description: '価格改定前の緊急性' },
    { id: 'now_2', category: '今すぐ型', name: '在庫が残りわずかです', description: '入荷・希少性' },
    { id: 'now_3', category: '今すぐ型', name: '今日だけの限定価格', description: 'タイムセール・限定割引' },

    // Inside Story (裏側暴露型)
    { id: 'inside_1', category: '裏側暴露型', name: '〇〇の裏側を公開します', description: '業界知識・内部情報' },
    { id: 'inside_2', category: '裏側暴露型', name: '実は〇〇なんです', description: 'プロの選択・信頼性' },

    // Iron Plate/Repeat (鉄板リピート型)
    { id: 'repeat_1', category: '鉄板リピート型', name: '3年愛用しています', description: '長期使用の確信' },
    { id: 'repeat_2', category: '鉄板リピート型', name: '結局これに戻ってきました', description: '定番・安定感' },
    { id: 'repeat_3', category: '鉄板リピート型', name: '何回もリピートしています', description: 'リピート率商品' },

    // Special/Push (特別公開型・ガチ推し型)
    { id: 'special_1', category: '特別公開型', name: 'フォロワー限定で教えます', description: '限定感・特別感' },
    { id: 'push_1', category: 'ガチ推し型', name: '人生が変わりました', description: '上級の評価' },
    { id: 'push_2', category: 'ガチ推し型', name: '唯一無二の推しです', description: '一無二の推奨' }
];

// CTAs from the "CTA Template" Excel sheet
export const CTAS = [
    // Casual Invitation (カジュアル誘導型)
    '気になったら見に来てね',
    '詳細はプロフのリンクから',
    'リンクからチェックしてね',

    // Urgency (緊急性訴求型)
    '今だけ〇〇です',
    '明日には終了します',
    '在庫限りとなります',
    'このチャンスを逃さないで',

    // Value (お得感訴求型)
    'この価格は今だけ',
    'コスパ最強です',
    'ポイント〇倍です',

    // Back-push (背中押し型)
    'とりあえず試してみて',
    '見逃さないでね',
    '気になったら保存してね',
    '後で後悔しないように',

    // Experience (体験談型)
    '私はこれで変わりました',
    'これのおかげです',

    // Scarcity (希少性訴求型)
    'バズってます',
    '知ってる人だけ得をする',
    'これ持ってる人少ないかも',
    '売り切れる前に急げ'
];
