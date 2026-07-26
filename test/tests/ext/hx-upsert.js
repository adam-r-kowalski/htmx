describe('hx-upsert extension', function() {

    let extBackup;

    before(async () => {
        extBackup = backupExtensions();
        clearExtensions();
        let script = document.createElement('script');
        script.src = '../src/ext/hx-upsert.js';
        await new Promise(resolve => {
            script.onload = resolve;
            document.head.appendChild(script);
        });
    })

    after(() => {
        restoreExtensions(extBackup);
    })

    beforeEach(() => {
        setupTest(this.currentTest)
    })

    afterEach(() => {
        cleanupTest(this.currentTest)
    })

    it('updates existing element by id', async function () {
        mockResponse('GET', '/test', '<div id="item-1">Updated</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.querySelector('#item-1').textContent, 'Updated')
    })

    it('replaced element is live and can trigger a new request', async function () {
        mockResponse('GET', '/test', '<div id="item-1"><button id="btn" hx-get="/test2" hx-trigger="click consume" hx-target="#item-1" hx-swap="innerHTML">Click</button></div>')
        mockResponse('GET', '/test2', 'Triggered')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original</div></div>');
        div.click()
        await htmx.timeout(20)
        let btn = div.querySelector('#btn')
        assert.isNotNull(btn, 'button should exist after first swap')
        assert.isTrue(!!btn._htmx?.initialized, 'button should be htmx-initialized')
        btn.click()
        await htmx.timeout(20)
        assert.equal(div.querySelector('#item-1').textContent, 'Triggered')
    })

    it('inserts new element', async function () {
        mockResponse('GET', '/test', '<div id="item-2">New</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children.length, 2)
        assert.equal(div.querySelector('#item-2').textContent, 'New')
    })

    it('preserves existing elements not in response', async function () {
        mockResponse('GET', '/test', '<div id="item-2">New</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children.length, 2)
        assert.equal(div.querySelector('#item-1').textContent, 'Original')
    })







    it('prepends unmatched elements', async function () {
        mockResponse('GET', '/test', '<div>No Key</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert prepend"><div id="item-1">Original</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children[0].textContent, 'No Key')
        assert.equal(div.children[1].id, 'item-1')
    })

    it('appends unmatched elements by default', async function () {
        mockResponse('GET', '/test', '<div>No Key</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children[0].id, 'item-1')
        assert.equal(div.children[1].textContent, 'No Key')
    })





    it('updates multiple existing elements', async function () {
        mockResponse('GET', '/test', '<div id="item-1">Updated 1</div><div id="item-2">Updated 2</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original 1</div><div id="item-2">Original 2</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.querySelector('#item-1').textContent, 'Updated 1')
        assert.equal(div.querySelector('#item-2').textContent, 'Updated 2')
    })

    it('handles mixed keyed and unkeyed elements', async function () {
        mockResponse('GET', '/test', '<div id="item-2">Two</div><div>Unkeyed</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">One</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children.length, 3)
        assert.equal(div.children[0].id, 'item-1')
        assert.equal(div.children[1].id, 'item-2')
        assert.equal(div.children[2].textContent, 'Unkeyed')
    })

    it('sort with prepend puts unkeyed first', async function () {
        mockResponse('GET', '/test', '<div id="item-2">Two</div><div>Unkeyed</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert sort prepend"><div id="item-1">One</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children[0].textContent, 'Unkeyed')
        assert.equal(div.children[1].id, 'item-1')
        assert.equal(div.children[2].id, 'item-2')
    })

    it('preserves element order when all matched', async function () {
        mockResponse('GET', '/test', '<div id="item-2">Updated 2</div><div id="item-1">Updated 1</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original 1</div><div id="item-2">Original 2</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children[0].id, 'item-1')
        assert.equal(div.children[1].id, 'item-2')
        assert.equal(div.children[0].textContent, 'Updated 1')
        assert.equal(div.children[1].textContent, 'Updated 2')
    })

    it('handles empty response', async function () {
        mockResponse('GET', '/test', '')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert"><div id="item-1">Original</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children.length, 1)
        assert.equal(div.querySelector('#item-1').textContent, 'Original')
    })

    it('works with hx-swap-oob upsert', async function () {
        mockResponse('GET', '/test', '<div id="main-item">Main</div><div id="other" hx-swap-oob="upsert"><div id="oob-1">OOB</div></div>')
        let container = createProcessedHTML('<div><div hx-get="/test" hx-swap="innerHTML">Original</div><div id="other"><div id="oob-2">Existing</div></div></div>');
        let div = container.children[0]
        div.click()
        await htmx.timeout(50)
        let updatedOther = container.querySelector('#other')
        let mainItem = div.querySelector('#main-item')
        assert.isNotNull(mainItem)
        assert.equal(mainItem.textContent, 'Main')
        assert.equal(updatedOther.children.length, 2)
        assert.equal(updatedOther.querySelector('#oob-1').textContent, 'OOB')
        assert.equal(updatedOther.querySelector('#oob-2').textContent, 'Existing')
    })



    it('works with hx-partial', async function () {
        mockResponse('GET', '/test', '<hx-partial hx-target="#list1" hx-swap="upsert"><div id="item-2">Two</div></hx-partial><hx-partial hx-target="#list2" hx-swap="upsert"><div id="item-b">B</div></hx-partial>')
        let container = createProcessedHTML('<div hx-get="/test"><div id="list1"><div id="item-1">One</div></div><div id="list2"><div id="item-a">A</div></div></div>');
        container.click()
        await htmx.timeout(20)
        let list1 = container.querySelector('#list1')
        let list2 = container.querySelector('#list2')
        assert.equal(list1.children.length, 2)
        assert.equal(list1.querySelector('#item-1').textContent, 'One')
        assert.equal(list1.querySelector('#item-2').textContent, 'Two')
        assert.equal(list2.children.length, 2)
        assert.equal(list2.querySelector('#item-a').textContent, 'A')
        assert.equal(list2.querySelector('#item-b').textContent, 'B')
    })



    it('sorts descending with sort:desc', async function () {
        mockResponse('GET', '/test', '<div id="item-2">Two</div>')
        let div = createProcessedHTML('<div hx-get="/test" hx-swap="upsert sort:desc"><div id="item-3">Three</div><div id="item-1">One</div></div>');
        div.click()
        await htmx.timeout(20)
        assert.equal(div.children[0].id, 'item-3')
        assert.equal(div.children[1].id, 'item-2')
        assert.equal(div.children[2].id, 'item-1')
    })

    it('hx-upsert tag with basic upsert', async function () {
        mockResponse('GET', '/test', '<hx-upsert hx-target="#list"><div id="item-2">Two</div></hx-upsert>')
        let container = createProcessedHTML('<div hx-get="/test"><div id="list"><div id="item-1">One</div></div></div>');
        container.click()
        await htmx.timeout(20)
        let list = container.querySelector('#list')
        assert.equal(list.children.length, 2)
        assert.equal(list.querySelector('#item-1').textContent, 'One')
        assert.equal(list.querySelector('#item-2').textContent, 'Two')
    })

    it('hx-upsert tag with sort attribute', async function () {
        mockResponse('GET', '/test', '<hx-upsert hx-target="#list" sort><div id="item-2">Two</div></hx-upsert>')
        let container = createProcessedHTML('<div hx-get="/test"><div id="list"><div id="item-1">One</div><div id="item-3">Three</div></div></div>');
        container.click()
        await htmx.timeout(20)
        let list = container.querySelector('#list')
        assert.equal(list.children[0].id, 'item-1')
        assert.equal(list.children[1].id, 'item-2')
        assert.equal(list.children[2].id, 'item-3')
    })

    it('hx-upsert tag with sort="desc"', async function () {
        mockResponse('GET', '/test', '<hx-upsert hx-target="#list" sort="desc"><div id="item-2">Two</div></hx-upsert>')
        let container = createProcessedHTML('<div hx-get="/test"><div id="list"><div id="item-3">Three</div><div id="item-1">One</div></div></div>');
        container.click()
        await htmx.timeout(20)
        let list = container.querySelector('#list')
        assert.equal(list.children[0].id, 'item-3')
        assert.equal(list.children[1].id, 'item-2')
        assert.equal(list.children[2].id, 'item-1')
    })

    it('hx-upsert tag with key attribute', async function () {
        mockResponse('GET', '/test', '<hx-upsert hx-target="#list" key="data-priority" sort><div id="task-2" data-priority="2">Medium</div></hx-upsert>')
        let container = createProcessedHTML('<div hx-get="/test"><div id="list"><div id="task-3" data-priority="1">High</div><div id="task-1" data-priority="3">Low</div></div></div>');
        container.click()
        await htmx.timeout(20)
        let list = container.querySelector('#list')
        assert.equal(list.children[0].getAttribute('data-priority'), '1')
        assert.equal(list.children[1].getAttribute('data-priority'), '2')
        assert.equal(list.children[2].getAttribute('data-priority'), '3')
    })

    it('hx-upsert tag with prepend attribute', async function () {
        mockResponse('GET', '/test', '<hx-upsert hx-target="#list" prepend><div>No Key</div></hx-upsert>')
        let container = createProcessedHTML('<div hx-get="/test"><div id="list"><div id="item-1">One</div></div></div>');
        container.click()
        await htmx.timeout(20)
        let list = container.querySelector('#list')
        assert.equal(list.children[0].textContent, 'No Key')
        assert.equal(list.children[1].id, 'item-1')
    })

    it('orders canonical rows by stream version instead of DOM ID and leaves pending rows last', async function () {
        mockResponse('GET', '/test', '<li id="smith-message-2" data-stream-version="3" data-update-version="3">Human 2</li><li id="smith-task-2" data-stream-version="4" data-update-version="4">Task 2</li>')
        let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version"><li id="smith-message-1" data-stream-version="1" data-update-version="1">Human 1</li><li id="pending" data-pending="true">Pending</li><li id="smith-task-1" data-stream-version="2" data-update-version="2">Task 1</li></ol>')
        list.click()
        await htmx.timeout(20)
        assert.deepEqual(Array.from(list.children, child => child.id), [
            'smith-message-1',
            'smith-task-1',
            'smith-message-2',
            'smith-task-2',
            'pending'
        ])
    })

    it('repositions an existing row when its canonical position arrives', async function () {
        mockResponse('GET', '/test', '<li id="human-2" data-stream-version="3" data-update-version="3">Committed</li>')
        let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version"><li id="human-1" data-stream-version="1" data-update-version="1">Human 1</li><li id="task-1" data-stream-version="2" data-update-version="2">Task 1</li><li id="task-2" data-stream-version="4" data-update-version="4">Task 2</li><li id="human-2" data-pending="true">Pending</li></ol>')
        list.click()
        await htmx.timeout(20)
        assert.deepEqual(Array.from(list.children, child => child.id), [
            'human-1',
            'task-1',
            'human-2',
            'task-2'
        ])
        assert.equal(find('#human-2').textContent, 'Committed')
    })

    it('ignores duplicate and stale versions but accepts a newer version', async function () {
        mockResponse('GET', '/test', '<li id="task" data-stream-version="2" data-update-version="8">Duplicate</li><li id="task" data-stream-version="2" data-update-version="7">Stale</li><li id="task" data-stream-version="2" data-update-version="9">Newer</li>')
        let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version"><li id="task" data-stream-version="2" data-update-version="8">Current</li></ol>')
        list.click()
        await htmx.timeout(20)
        assert.equal(find('#task').textContent, 'Newer')
        assert.equal(list.children.length, 1)
    })

    it('compares u64 decimal versions without Number precision loss', async function () {
        mockResponse('GET', '/test', '<li id="middle" data-stream-version="18446744073709551614" data-update-version="18446744073709551614">Middle</li>')
        let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version"><li id="last" data-stream-version="18446744073709551615" data-update-version="18446744073709551615">Last</li><li id="first" data-stream-version="9007199254740993" data-update-version="9007199254740993">First</li></ol>')
        list.click()
        await htmx.timeout(20)
        assert.deepEqual(Array.from(list.children, child => child.id), [
            'first',
            'middle',
            'last'
        ])
    })

})
