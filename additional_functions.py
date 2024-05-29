import pickle
import torch
import numpy as np
import re
from dict import *
from nltk import word_tokenize
from captum.attr import LayerIntegratedGradients
from dict import *
from nltk.stem.snowball import SnowballStemmer
from nltk import word_tokenize, download
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from transformers import AutoModelForSequenceClassification
from transformers import AutoTokenizer, BertConfig

from qdrant_client import QdrantClient

stemmer = SnowballStemmer("russian")
russian_stopwords = stopwords.words("russian")
russian_stopwords.extend(
    ['это', 'как', 'так', 'и', 'в', 'над', 'к', 'до', 'не', 'на', 'но', 'за', 'то', 'с', 'ли', 'а', 'во', 'от', 'со',
     'для', 'о', 'же', 'ну', 'вы', 'бы', 'что', 'кто', 'он', 'она', 'оно', 'из-за', 'также'])


config = BertConfig.from_json_file("model/wiki_final_bert_model/config.json")

model = AutoModelForSequenceClassification.from_pretrained(
    "model/wiki_final_bert_model", config=config
)
tokenizer = AutoTokenizer.from_pretrained("model/wiki_final_bert_tokenizer")


with open('model/bi_encoder.pickle', 'rb') as file:
    bi_encoder = pickle.load(file)



# Создаем подключение к векторной БД
qdrant_client = QdrantClient(
    url="https://3bff1843-f3d9-4163-9662-c51ae29efadb.europe-west3-0.gcp.cloud.qdrant.io:6333",
    api_key="vDtHoKJfQgdmmw9RzjEcaJjIsRIlywXo79tE65enlw2WIywzwHw-dA",
    timeout=60
)

COLL_NAME = 'znanie_hackathon_db'

#
text_to_predict = 'александра сергеевича пушкина стихотворение было написано в и впервые опубликовано в московском вестнике'


def text_cleaning(text):
  # Удаляем вики-разметку с учетом шаблонов и параметров
    text = re.sub(r'{{.*?}}', '', text, flags=re.DOTALL)
  # Удаляем HTML-теги
    text = re.sub(r'<.*?>', '', text)
  # Удаляем ссылки с учетом различных форматов
    text = re.sub(r'\[\[([^|\]]*\|)?([^\]]*)\]\]', r'\2', text)
    text = re.sub(r'(?<=[^\w\d])-|-(?=[^\w\d])|[^\w\d\s-]', '', text) #Удаляем все символы, кроме букв, цифр, пробелов и дефисов
    text = re.sub(r"\d+px", "", text)
    text = re.sub(r"\b[a-z]{3}_[a-z]+( \d+)?\b", "", text)

  # Удаляем лишние пробелы и переводы строк
    text = re.sub(r'\s+', ' ', text).strip()
  # Приводим к нижнему регистру
    text = text.lower()
    return text


def remove_stopwords(text):
    tokens = word_tokenize(text)
    filtered_tokens = [token for token in tokens if token not in specific_stopwords and token not in top_tokens_to_remove]
    return " ".join(filtered_tokens)

def remove_non_russian_words(text):
    russian_word_pattern = re.compile(r'^[а-яА-Я]+$')
    words = text.split()
    russian_words = [word for word in words if russian_word_pattern.match(word)]
    return ' '.join(russian_words)


def preprocessing_data(text):
    # text = text.lower()
    text = text_cleaning(text)
    text = remove_stopwords(text)
    text = remove_non_russian_words(text)

    return text

def predict(input_ids, token_type_ids, attention_mask):
    encoding = {
        'input_ids': input_ids.to(model.device),
        'token_type_ids': token_type_ids.to(model.device),
        'attention_mask': attention_mask.to(model.device)
    }
    outputs = model(**encoding)
    return outputs

def squad_pos_forward_func(inputs, token_type_ids=None, attention_mask=None, position=0):
    pred = predict(inputs.to(torch.long), token_type_ids.to(torch.long), attention_mask.to(torch.long))
    pred = pred[position]
    return pred.max(1).values

lig = LayerIntegratedGradients(squad_pos_forward_func, model.bert.embeddings)

def get_description_interpreting(attrs):
    positive_weights = attrs
    return {
        'positive_weights': (
            positive_weights,
            {
                'min': np.min(positive_weights),
                'max': np.max(positive_weights)
            }
        ),
    }

def tokenize_data(text):
    return tokenizer(text['text'], padding=True, truncation=True, max_length=512, return_tensors='pt')

def str_to_vec(bi_encoder, text):
    embeddings = bi_encoder.encode(
        text,
        convert_to_tensor=True
    )
    return embeddings


def vec_search(bi_encoder, query, n_top_cos):
    # Кодируем запрос в вектор
    query_emb = str_to_vec(bi_encoder, query).tolist()

    # Поиск в БД
    search_result = qdrant_client.search(
        collection_name=COLL_NAME,
        query_vector=query_emb,
        limit=n_top_cos,
        with_vectors=False
    )

    top_chunks = [[x.payload['chunk'], x.score] for x in search_result if x.score > 0.6]

    return top_chunks

def transform_token_ids(func_data, token_ids, word):
    tokens = list(map(lambda x: tokenizer.convert_ids_to_tokens([x])[0].replace('##', ''), tokenize_data({'text': preprocessing_data(word)})['input_ids'][0]))
    weights = [func_data['positive_weights'][0][i] for i in token_ids]
    wts = []
    for i in range(len(weights)):
        if weights[i] > 0:
            mn = max(func_data['positive_weights'][1]['min'], 0)
            mx = func_data['positive_weights'][1]['max']
            wts.append((weights[i] - mn) / mx)

    try:

        if sum(wts) / len(wts) >= 0.01:
            print(word, sum(wts) / len(wts))
            return f'<span data-value={sum(wts) / len(wts)}>{word}</span>'
    except:
        pass
    return word

def build_text(tokens, func_data, current_text):
    splitted_text = current_text.split()
    splitted_text_iterator = 0
    current_word = ''
    current_word_ids = []
    for i, token in enumerate(tokens):
        decoded = tokenizer.convert_ids_to_tokens([token])[0]
        if decoded == '[CLS]': continue
        if not len(current_word):
            current_word = decoded
            current_word_ids.append(i)
        elif decoded.startswith('##'):
            current_word += decoded[2:]
            current_word_ids.append(i)
        else:
            while preprocessing_data(splitted_text[splitted_text_iterator]) != current_word:
                splitted_text_iterator += 1
            current_word = decoded
            splitted_text[splitted_text_iterator] = transform_token_ids(func_data, current_word_ids, splitted_text[splitted_text_iterator])

            current_word_ids = []
    return ' '.join(splitted_text)

pattern = r'<span data-value=(.*?)>(.*?)</span>'
def highlight_words(text):
    def replace(match):
        value = match.group(1)
        word = match.group(2)
        color = f'rgba(255, 255, 0, {value})'  # Желтый цвет с прозрачностью, зависящей от значения
        return f'<span style="background-color:{color}; padding:2px; border-radius:4px; cursor:pointer" title="{[value, vec_search(bi_encoder, word, n_top_cos=3)]}">{word}</span>'
    return re.sub(pattern, replace, text)

