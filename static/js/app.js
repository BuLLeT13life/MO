gsap.registerPlugin(ScrollTrigger, ScrollSmoother)



const textarea = document.getElementById('swap');
const imageToRemove = document.querySelector('img[src="/static/img/work/5.jpg"]');
const button = document.getElementById('qqq');
const storyText = document.getElementById('story');

const myDictionary_final_assess = {
    '1': 'Текст стилистически нейтрален',
    '0': 'Текст может иметь агитации, эмоционально или политически окрашенные конструкции'
}
const myDictionary = {
    '1': 'Текст  нейтрален. ',
    '0': 'Текст имеет окрас. '
}


button.addEventListener('click', () => {
    const storyText = document.getElementById('story').value;
    const fileInput = document.getElementById('chooseFile');

    event.preventDefault();
    if (fileInput.files.length > 0) {
        // Обработка файла
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/process_json', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                console.log(response.text); // Вывод полного ответа
                console.log(response.value); // Вывод значения "value"
                console.log(response.cat); // Вывод значения "cat"
                const myTable = document.createElement('table');
                myTable.id = 'myTable';
                const headerRow = myTable.insertRow();
                headerRow.insertCell().textContent = 'Нейросетевой метод';
                headerRow.insertCell().textContent = 'Статистический метод';
                headerRow.insertCell().textContent = 'Вероятность принадлежности к классу';
                headerRow.insertCell().textContent = 'Итоговая оценка';


                const CONST_RUBERT = 0.87;
                const CONST_CAT = 0.86;

                const finalPrediction = ((response.value * CONST_RUBERT) + (response.cat * CONST_CAT)) / 2;

                if (finalPrediction > 0.5) {
                    final_assess = myDictionary_final_assess['1']
                }
                else {
                    final_assess = myDictionary_final_assess['0']
                }


                console.log("Итоговая точность:", finalPrediction); // Вывод результата

                const dataRow = myTable.insertRow();
                dataRow.insertCell().textContent = myDictionary[response.value] + 'Точность модели : 0.87';
                dataRow.insertCell().textContent = myDictionary[response.cat] + 'Точность модели : 0.86';
                dataRow.insertCell().textContent = finalPrediction;
                dataRow.insertCell().textContent = final_assess;

                const newDiv = document.createElement('div');
                newDiv.id = 'display-div';
                newDiv.contentEditable = true;
                newDiv.style.padding = '10px';
                newDiv.style.opacity = '0';
                setTimeout(() => {
                    newDiv.style.opacity = '1';
                }, 10);

                textarea.parentNode.replaceChild(myTable, textarea);
                imageToRemove.parentNode.replaceChild(newDiv, imageToRemove);
                updateDisplayDiv(response.text);
            } else {
                console.error('Ошибка при отправке запроса');
            }
        };
        xhr.send(formData);
    } else {
        // Обработка текста
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/process_text', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onload = function () {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                console.log(response.text); // Вывод полного ответа
                console.log(response.value_bert); // Вывод значения "value"
                console.log(response.value_cat); // Вывод значения "cat"
                const myTable = document.createElement('table');
                myTable.id = 'myTable';
                const headerRow = myTable.insertRow();
                headerRow.insertCell().textContent = 'Нейросетевой метод';
                headerRow.insertCell().textContent = 'Статистический метод';
                headerRow.insertCell().textContent = 'Вероятность принадлежности к классу';
                headerRow.insertCell().textContent = 'Итоговая оценка';


                const CONST_RUBERT = 0.87;
                const CONST_CAT = 0.86;

                const finalPrediction = ((response.value_bert * CONST_RUBERT) + (response.value_cat * CONST_CAT)) / 2;

                if (finalPrediction > 0.5) {
                    final_assess = myDictionary_final_assess['1']
                }
                else {
                    final_assess = myDictionary_final_assess['0']
                }


                console.log("Итоговая точность:", finalPrediction); // Вывод результата

                const dataRow = myTable.insertRow();
                dataRow.insertCell().textContent = myDictionary[response.value_bert] + 'Точность модели : 0.87';
                dataRow.insertCell().textContent = myDictionary[response.value_cat] + 'Точность модели : 0.86';
                dataRow.insertCell().textContent = finalPrediction;
                dataRow.insertCell().textContent = final_assess;


                const newDiv = document.createElement('div');
                newDiv.id = 'display-div';
                newDiv.contentEditable = true;
                newDiv.style.padding = '10px';
                newDiv.style.opacity = '0';
                setTimeout(() => {
                    newDiv.style.opacity = '1';
                }, 10);

                textarea.parentNode.replaceChild(myTable, textarea);
                imageToRemove.parentNode.replaceChild(newDiv, imageToRemove);
                // Заменяем textarea на div




//            // Обновляем содержимое div
                updateDisplayDiv(response.text);
            } else {
                console.error('Ошибка при отправке запроса');
            }
        };




        xhr.send('text=' + encodeURIComponent(storyText));
    }
});


function updateDisplayDiv(text) {
    console.log("Updating div with text:", text); // Debug log
    const displayDiv = document.getElementById('display-div');
    if (displayDiv) {
        displayDiv.innerHTML = text; // Используем innerHTML для вставки HTML контента
    } else {
        console.error("Div element not found!"); // Debug log
    }
}

function restoreOriginalContent() {
    const newText = document.getElementById('result');
    const newDiv = document.getElementById('display-div');

    if (newText && newDiv) {
        newText.parentNode.replaceChild(textarea, newText);
        newDiv.parentNode.replaceChild(imageToRemove, newDiv);
    } else {
        console.error("Elements to restore not found!");
    }
}

const fileInput = document.getElementById('chooseFile');
const fileNameDisplay = document.getElementById('fileName');
const noFileDisplay = document.getElementById('noFile');

// Добавьте обработчик события для изменения файла
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        noFileDisplay.textContent = file.name; // Покажите имя файла
    } else {
        fileNameDisplay.textContent = 'Выберите фаил'; // Верните текст по умолчанию
        noFileDisplay.style.display = 'block'; // Показать сообщение "Фаил не выбран..."
    }
});



if (ScrollTrigger.isTouch !== 1) {

	ScrollSmoother.create({
		wrapper: '.wrapper',
		content: '.content',
		smooth: 1.5,
		effects: true
	})

	gsap.fromTo('.hero-section', { opacity: 1 }, {
		opacity: 0,
		scrollTrigger: {
			trigger: '.hero-section',
			start: 'center',
			end: '820',
			scrub: true
		}
	})

	let itemsL = gsap.utils.toArray('.gallery__left .gallery__item ')

	itemsL.forEach(item => {
		gsap.fromTo(item, { opacity: 0, x: -50 }, {
			opacity: 1, x: 0,
			scrollTrigger: {
				trigger: item,
				start: '-850',
				end: '-100',
				scrub: true
			}
		})
	})

	let itemsR = gsap.utils.toArray('.gallery__right .gallery__item ')

	itemsR.forEach(item => {
		gsap.fromTo(item, { opacity: 0, x: 50 }, {
			opacity: 1, x: 0,
			scrollTrigger: {
				trigger: item,
				start: '-750',
				end: 'top',
				scrub: true
			}
		})
	})

}


// gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

// const textarea = document.getElementById('swap');
// const imageToRemove = document.querySelector('img[src="/static/img/work/5.jpg"]');
// const button = document.getElementById('qqq');
// const storyText = document.getElementById('story');

// const modal = document.createElement('div');
// modal.classList.add('modal');

// button.addEventListener('click', () => {
//     const storyText = document.getElementById('story').value;
//     event.preventDefault();
//     const xhr = new XMLHttpRequest();
//     xhr.open('POST', '/process_text', true);
//     xhr.setRequestHeader('Content-Type', 'application/json');
//     xhr.onload = function () {
//         if (xhr.status === 200) {
//             const response = JSON.parse(xhr.responseText);
//             localStorage.setItem('modalText', response.text); // Сохраняем текст в LocalStorage
//             localStorage.setItem('modalValue', response.value); // Сохраняем значение в LocalStorage
//             window.location.href = '/result'; // Переход на другую страницу
//         } else {
//             console.log('modalText', response.text); // Вывод в консоль
//             console.error('Ошибка при отправке запроса');
//         }
//     };
//     xhr.send('text=' + encodeURIComponent(storyText));
// });

// // Страница с таблицей
// document.addEventListener('DOMContentLoaded', () => {
//     const modalText = localStorage.getItem('modalText');
//     const modalValue = localStorage.getItem('modalValue');
//     if (modalText) {
//         const table = document.getElementById('myTable');
//         const row = table.querySelector('tr:nth-child(2)');
//         const valueCell = row.insertCell();
//         valueCell.textContent = modalValue;

//         const linkCell = row.lastElementChild;
//         linkCell.textContent = "Оценка 1";
//         linkCell.addEventListener('click', () => {
//             modal.innerHTML = `
//             <div class="modal-content">
//             <span class="close">×</span>
//             <p>${modalText}</p>
//           </div>
//             `;
//             document.body.appendChild(modal);
//             const closeButton = modal.querySelector('.close');
//             closeButton.addEventListener('click', () => modal.remove());
//         });
//         localStorage.removeItem('modalText'); // Очищаем LocalStorage
//         localStorage.removeItem('modalValue'); // Очищаем LocalStorage
//     }
// });


// if (ScrollTrigger.isTouch !== 1) {

// 	ScrollSmoother.create({
// 		wrapper: '.wrapper',
// 		content: '.content',
// 		smooth: 1.5,
// 		effects: true
// 	})

// 	gsap.fromTo('.hero-section', { opacity: 1 }, {
// 		opacity: 0,
// 		scrollTrigger: {
// 			trigger: '.hero-section',
// 			start: 'center',
// 			end: '820',
// 			scrub: true
// 		}
// 	})

// 	let itemsL = gsap.utils.toArray('.gallery__left .gallery__item ')

// 	itemsL.forEach(item => {
// 		gsap.fromTo(item, { opacity: 0, x: -50 }, {
// 			opacity: 1, x: 0,
// 			scrollTrigger: {
// 				trigger: item,
// 				start: '-850',
// 				end: '-100',
// 				scrub: true
// 			}
// 		})
// 	})

// 	let itemsR = gsap.utils.toArray('.gallery__right .gallery__item ')

// 	itemsR.forEach(item => {
// 		gsap.fromTo(item, { opacity: 0, x: 50 }, {
// 			opacity: 1, x: 0,
// 			scrollTrigger: {
// 				trigger: item,
// 				start: '-750',
// 				end: 'top',
// 				scrub: true
// 			}
// 		})
// 	})

// }

