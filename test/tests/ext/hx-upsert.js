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

    it('does not reparent untouched rows in an already ordered target', async function () {
        mockResponse('GET', '/test', '<li id="task-2" data-stream-version="4" data-update-version="5">Task 2 updated</li>')
        let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version"><li id="human-1" data-stream-version="1" data-update-version="1">Human 1</li><li id="task-1" data-stream-version="2" data-update-version="2">Task 1</li><li id="human-2" data-stream-version="3" data-update-version="3">Human 2</li><li id="task-2" data-stream-version="4" data-update-version="4">Task 2</li></ol>')
        let untouched = [
            list.querySelector('#human-1'),
            list.querySelector('#task-1'),
            list.querySelector('#human-2')
        ]
        let mutationRecords = []
        let observer = new MutationObserver(records => mutationRecords.push(...records))
        observer.observe(list, {childList: true})

        list.click()
        await htmx.timeout(20)
        mutationRecords.push(...observer.takeRecords())
        observer.disconnect()

        let mutatedIds = mutationRecords.flatMap(record => [
            ...Array.from(record.addedNodes, node => node.id).filter(Boolean),
            ...Array.from(record.removedNodes, node => node.id).filter(Boolean)
        ])
        assert.deepEqual(
            Array.from(new Set(mutatedIds)),
            ['task-2'],
            `only the changed row may be reparented; observed ${mutatedIds.join(', ')}`
        )
        assert.deepEqual(
            untouched,
            [
                list.querySelector('#human-1'),
                list.querySelector('#task-1'),
                list.querySelector('#human-2')
            ],
            'untouched rows must retain their exact DOM nodes'
        )
    })

    it('preserves a visible document scroll anchor while updating a later row', async function () {
        let rows = Array.from({length: 12}, (_, index) => {
            let version = index + 1
            return `<li id="row-${version}" data-stream-version="${version}" data-update-version="${version}" style="height: 320px">Row ${version}</li>`
        }).join('')
        mockResponse('GET', '/test', '<li id="row-12" data-stream-version="12" data-update-version="13" style="height: 320px">Row 12 updated</li>')
        let list = createProcessedHTML(`<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version">${rows}</ol>`)
        let sentinel = list.querySelector('#row-9')
        sentinel.scrollIntoView({block: 'start'})
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        let before = {
            scrollY: window.scrollY,
            sentinelTop: sentinel.getBoundingClientRect().top
        }
        let minimumScrollY = before.scrollY
        let observer = new MutationObserver(() => {
            minimumScrollY = Math.min(minimumScrollY, window.scrollY)
        })
        observer.observe(list, {childList: true})

        list.click()
        await htmx.timeout(20)
        await new Promise(resolve => requestAnimationFrame(resolve))
        observer.disconnect()
        let after = {
            scrollY: window.scrollY,
            sentinelTop: sentinel.getBoundingClientRect().top
        }

        assert.isAbove(before.scrollY, 0, 'the fixture must begin below the top of the document')
        assert.closeTo(
            after.sentinelTop,
            before.sentinelTop,
            1,
            `the visible sentinel moved from ${before.sentinelTop}px to ${after.sentinelTop}px`
        )
        assert.isAbove(
            minimumScrollY,
            0,
            `the document jumped to the top during the upsert from scrollY ${before.scrollY}`
        )
    })

    it('performs zero mutations for duplicate and stale versions in either delivery order', async function () {
        for (let response of [
            '<li id="task" data-stream-version="2" data-update-version="8">Duplicate</li><li id="task" data-stream-version="2" data-update-version="7">Stale</li>',
            '<li id="task" data-stream-version="2" data-update-version="7">Stale</li><li id="task" data-stream-version="2" data-update-version="8">Duplicate</li>'
        ]) {
            mockResponse('GET', '/test', response)
            let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version"><li id="task" data-stream-version="2" data-update-version="8">Current</li></ol>')
            let records = []
            let observer = new MutationObserver(mutations => records.push(...mutations))
            observer.observe(list, {childList: true})
            list.click()
            await htmx.timeout(20)
            records.push(...observer.takeRecords())
            observer.disconnect()
            assert.equal(records.length, 0)
            assert.equal(list.firstElementChild.textContent, 'Current')
            list.remove()
        }
    })

    for (let fixture of [
        {
            name: 'before the first canonical row',
            existing: '<li id="two" data-stream-version="2">Two</li><li id="three" data-stream-version="3">Three</li>',
            incoming: '<li id="one" data-stream-version="1">One</li>',
            expected: ['one', 'two', 'three']
        },
        {
            name: 'between canonical rows',
            existing: '<li id="one" data-stream-version="1">One</li><li id="three" data-stream-version="3">Three</li>',
            incoming: '<li id="two" data-stream-version="2">Two</li>',
            expected: ['one', 'two', 'three']
        },
        {
            name: 'after the last canonical row',
            existing: '<li id="one" data-stream-version="1">One</li><li id="two" data-stream-version="2">Two</li>',
            incoming: '<li id="three" data-stream-version="3">Three</li>',
            expected: ['one', 'two', 'three']
        },
        {
            name: 'before a pending tail',
            existing: '<li id="one" data-stream-version="1">One</li><li id="pending" data-pending="true">Pending</li>',
            incoming: '<li id="two" data-stream-version="2">Two</li>',
            expected: ['one', 'two', 'pending']
        }
    ]) {
        it(`inserts one new row ${fixture.name} without reparenting siblings`, async function () {
            mockResponse('GET', '/test', fixture.incoming)
            let list = createProcessedHTML(`<ol hx-get="/test" hx-swap="upsert key:data-stream-version">${fixture.existing}</ol>`)
            let records = []
            let observer = new MutationObserver(mutations => records.push(...mutations))
            observer.observe(list, {childList: true})
            list.click()
            await htmx.timeout(20)
            records.push(...observer.takeRecords())
            observer.disconnect()
            let mutatedIds = records.flatMap(record => [
                ...Array.from(record.addedNodes, node => node.id).filter(Boolean),
                ...Array.from(record.removedNodes, node => node.id).filter(Boolean)
            ])
            assert.deepEqual(Array.from(list.children, node => node.id), fixture.expected)
            assert.deepEqual(Array.from(new Set(mutatedIds)), [fixture.expected.find(id => !fixture.existing.includes(`id="${id}"`))])
        })
    }

    it('replaces a pending tail in canonical order without moving unrelated rows', async function () {
        mockResponse('GET', '/test', '<li id="human-2" data-stream-version="3" data-update-version="3">Committed</li>')
        let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version version:data-update-version"><li id="human-1" data-stream-version="1" data-update-version="1">Human 1</li><li id="task-1" data-stream-version="2" data-update-version="2">Task 1</li><li id="task-2" data-stream-version="4" data-update-version="4">Task 2</li><li id="human-2" data-pending="true">Pending</li></ol>')
        let records = []
        let observer = new MutationObserver(mutations => records.push(...mutations))
        observer.observe(list, {childList: true})
        list.click()
        await htmx.timeout(20)
        records.push(...observer.takeRecords())
        observer.disconnect()
        let mutatedIds = records.flatMap(record => [
            ...Array.from(record.addedNodes, node => node.id).filter(Boolean),
            ...Array.from(record.removedNodes, node => node.id).filter(Boolean)
        ])
        assert.deepEqual(Array.from(list.children, node => node.id), ['human-1', 'task-1', 'human-2', 'task-2'])
        assert.deepEqual(Array.from(new Set(mutatedIds)), ['human-2'])
    })

    for (let fixture of [
        {
            name: 'later',
            existing: '<li id="one" data-stream-version="1">One</li><li id="changed" data-stream-version="2">Changed</li><li id="three" data-stream-version="3">Three</li>',
            incoming: '<li id="changed" data-stream-version="4">Changed later</li>',
            expected: ['one', 'three', 'changed']
        },
        {
            name: 'earlier',
            existing: '<li id="one" data-stream-version="1">One</li><li id="three" data-stream-version="3">Three</li><li id="changed" data-stream-version="4">Changed</li>',
            incoming: '<li id="changed" data-stream-version="2">Changed earlier</li>',
            expected: ['one', 'changed', 'three']
        }
    ]) {
        it(`moves only a same-ID row whose key changes ${fixture.name}`, async function () {
            mockResponse('GET', '/test', fixture.incoming)
            let list = createProcessedHTML(`<ol hx-get="/test" hx-swap="upsert key:data-stream-version">${fixture.existing}</ol>`)
            let records = []
            let observer = new MutationObserver(mutations => records.push(...mutations))
            observer.observe(list, {childList: true})
            list.click()
            await htmx.timeout(20)
            records.push(...observer.takeRecords())
            observer.disconnect()
            let mutatedIds = records.flatMap(record => [
                ...Array.from(record.addedNodes, node => node.id).filter(Boolean),
                ...Array.from(record.removedNodes, node => node.id).filter(Boolean)
            ])
            assert.deepEqual(Array.from(list.children, node => node.id), fixture.expected)
            assert.deepEqual(Array.from(new Set(mutatedIds)), ['changed'])
        })
    }

    it('repairs an initially unsorted target with the minimum sibling moves', async function () {
        mockResponse('GET', '/test', '')
        let list = createProcessedHTML('<ol hx-get="/test" hx-swap="upsert key:data-stream-version"><li id="three" data-stream-version="3">Three</li><li id="one" data-stream-version="1">One</li><li id="two" data-stream-version="2">Two</li><li id="pending-1">Pending 1</li><li id="pending-2">Pending 2</li></ol>')
        let records = []
        let observer = new MutationObserver(mutations => records.push(...mutations))
        observer.observe(list, {childList: true})
        list.click()
        await htmx.timeout(20)
        records.push(...observer.takeRecords())
        observer.disconnect()
        let mutatedIds = records.flatMap(record => [
            ...Array.from(record.addedNodes, node => node.id).filter(Boolean),
            ...Array.from(record.removedNodes, node => node.id).filter(Boolean)
        ])
        assert.deepEqual(Array.from(list.children, node => node.id), ['one', 'two', 'three', 'pending-1', 'pending-2'])
        assert.deepEqual(Array.from(new Set(mutatedIds)), ['three'])
    })

})
