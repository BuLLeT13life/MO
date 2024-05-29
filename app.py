from flask import Flask, render_template, request, jsonify , redirect, url_for
import pickle, json
from flask_caching import Cache
from additional_functions import preprocessing_data, lig, get_description_interpreting, build_text, predict, highlight_words

from catboost import CatBoostClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

import numpy as np

app = Flask(__name__)

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@cache.memoize(timeout=None)
def load_models():
    with open('model/tokenizer.pickle', 'rb') as file:
        tokenizer = pickle.load(file)
    with open('model/rf_model.pickle', 'rb') as file:
        cls = pickle.load(file)
    with open('model/tfidf_model.pickle', 'rb') as file:
        tfidf_moodel = pickle.load(file)

    return tokenizer, cls, tfidf_moodel

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/process_text', methods=['POST'])
def process_text():
    text = request.form['text']
    text_ready, prediction_bert, prediction_cat = process(text)

    if isinstance(prediction_bert, np.int64):
        prediction_bert = float(prediction_bert)
    if isinstance(prediction_cat, np.int64):
        prediction_cat = float(prediction_cat)

    print(text_ready, prediction_bert, prediction_cat, type(prediction_bert), type(prediction_cat))

    return jsonify({'text': text_ready, 'value_bert': prediction_bert, 'value_cat': prediction_cat})


@app.route('/process_json', methods=['POST'])
def process_json():
    # Получаем файл
    file = request.files['file']

    # Проверяем, является ли файл JSON
    if file.filename.endswith('.json'):
        # Читаем файл
        try:
            data = json.load(file)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON file'}), 400

        # Извлекаем текст
        text = data.get('text')
        if not text:
            return jsonify({'error': 'Missing "text" key in JSON'}), 400

        # Вызываем process и получаем результаты
        text_ready, prediction_bert, prediction_cat = process(text)

        # Преобразуем в int перед сериализацией
        prediction_bert = float(prediction_bert)
        prediction_cat = float(prediction_cat)

        # Возвращаем ответ
        return jsonify({'text': text_ready, 'value': prediction_bert, 'cat': prediction_cat})
    else:
        return jsonify({'error': 'File must be a JSON file'}), 400

def process(text):
    text = preprocessing_data(text)
    tokenizer, cat, tfidf = load_models()

    # работа с rubert-tiny
    text_tokenized = tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors='pt')

    prediction = np.argmax(predict(text_tokenized['input_ids'], text_tokenized['token_type_ids'],
                                   text_tokenized['attention_mask']).logits.detach().numpy()[0])

    attrs = lig.attribute(text_tokenized['input_ids'],
                          additional_forward_args=(text_tokenized['attention_mask'], text_tokenized['token_type_ids'], 0))
    attrs = np.array(list(map(lambda x: x.sum(), attrs[0])))
    descr = get_description_interpreting(attrs)

    text_main = ''
    text_main += build_text(text_tokenized['input_ids'][0], descr, text) + ' '

    text_main = highlight_words(text_main)
    
    # работа с catboost
    
    catboost_prediction = cat.predict(tfidf.transform([text]))[0]

    return text_main, prediction, catboost_prediction

if __name__ == '__main__':
    app.run(debug=True)