# Импорт и экспорт расходов

## Компоненты

Диалоги в истории расходов: `client/src/components/ImportDialog.vue` и `ExportDialog.vue`. Преобразование/проверки в `client/src/services/expenseImport.ts`, экспорт — в `expenseExport.ts`; операции используют expense store и IndexedDB. Это клиентская функциональность, backend endpoint для файлов не используется.

## JSON import/export

JSON имеет `format: "finfast"`, `version: 1`, массив `expenses`. Export включает expense ID, amount, system `categoryId` если строка, `createdAt`, описание и payment date; не включает userId и sync flags. Импорт проверяет JSON parse, format/version, наличие непустого массива, обязательные поля, простой UUID regex, положительный amount, тип optional description/category и распознавание даты через `new Date()`.

Валидация выполняется для всех записей до merge; если файл невалиден, сохранение не должно начинаться. Merge идентифицирует дубликаты по expense ID в текущем user-scoped наборе: совпавшая запись обновляется и помечается unsynced, новая добавляется как unsynced. После merge UI сохраняет результат и перезагружает local store. Сам импорт не отправляет немедленно API sync.

Текущая проверка даты принимает всё, что парсит `Date`, а не строго ISO-8601; UUID regex допускает lowercase hex только. Повторяющиеся IDs внутри импортируемого массива отдельно не отвергаются. При изменении формата/version сохранять совместимость явно, не менять version 1 содержимое незаметно.

## CSV export

CSV содержит русские заголовки даты, суммы, категории, описания, UTF-8 BOM, CRLF и escaping кавычек/разделителей. Удалённые расходы фильтруются. CSV предназначен для просмотра, не является форматом обратимого backup.

## Известные расхождения с ожиданиями

- JSON export не записывает `customCategoryId`; импорт также не читает его. Custom category связи при backup/restore теряются.
- CSV создаёт поле `category`, но `toExportRows()` его не заполняет. Колонка «Категория» в текущем экспорте поэтому будет пустой.
- Дата CSV выводится из `createdAt`, а не `paymentDate`.
- Поле `categoryId` хранит только системную категорию; custom category отдельно и не экспортируется.
- Import merge для существующего расхода устанавливает categoryId из импортированной записи (может очистить ранее заданное значение), но в internal model нет category transfer для custom category.

При изменении импорта проверять all-or-nothing (сначала полная валидация, затем write), user-scoped duplicate detection, IndexedDB и синхронизацию; не создавать API calls непосредственно в диалоге.
