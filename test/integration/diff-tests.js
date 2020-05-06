/* global vm, render, renderCpu, canvas, document */
const {chromium} = require('playwright-chromium');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

const indexHTML = path.resolve(__dirname, 'index.html');
const testDir = (...args) => path.resolve(__dirname, 'diff-tests', ...args);

const testFile = (file, page) => test(file, async t => {
    // start each test by going to the index.html, and loading the scratch file
    await page.goto(`file://${indexHTML}`);
    const fileInput = await page.$('#file');
    await fileInput.setInputFiles(testDir(file));
    await page.evaluate(() =>
        // `loadFile` is defined on the page itself.
        // eslint-disable-next-line no-undef
        loadFile()
    );
    const msgsFromBrowser = await page.evaluate(() => {
        // This function is run INSIDE the integration chrome browser via some
        // injection and .toString() magic.  We can return some "simple data"
        // back across as a promise, so we will just log all the says that happen
        // for parsing after.

        const testCpuDiff = () => {
            const cpuData = renderCpu(render);

            // Get the image data from the GPU-rendered canvas
            render.draw();
            const mergeCanvas = document.createElement('canvas');
            mergeCanvas.width = canvas.width;
            mergeCanvas.height = canvas.height;
            const mergeCtx = mergeCanvas.getContext('2d');
            mergeCtx.drawImage(canvas, 0, 0);
            const gpuData = mergeCtx.getImageData(0, 0, 480, 360);

            let error = 0;

            for (let i = 0; i < cpuData.data.length; i++) {
                error += Math.abs(cpuData.data[i] - gpuData.data[i]);
            }

            // Average out the error across the three color channels
            error /= 3;

            // Calculate a visual diff
            const cpuDataCanvas = document.createElement('canvas');
            cpuDataCanvas.width = cpuData.width;
            cpuDataCanvas.height = cpuData.height;
            cpuDataCanvas.getContext('2d').putImageData(cpuData, 0, 0);
            mergeCtx.globalCompositeOperation = 'difference';
            mergeCtx.drawImage(cpuDataCanvas, 0, 0);

            return {
                error,
                diffImage: mergeCanvas.toDataURL()
            };
        };

        // this becomes `msgsFromBrowser` in the outer scope
        const messages = [];
        const TIMEOUT = 5000;

        const GLOW_ID = 'WdZ1xLb].Q$}5bVVu|at';

        // TODO: hook onto a better event!
        vm.runtime.on('SCRIPT_GLOW_ON', ({id}) => {
            if (id === GLOW_ID) {
                const {error, diffImage} = testCpuDiff();

                const maxError = 50;

                messages.push({
                    command: error > maxError ? 'fail' : 'pass',
                    text: error > maxError ?
                        `total error was ${error.toFixed(1)}, exceeding maximum allowed (${maxError})` :
                        `error did not exceed ${maxError}`,
                    error,
                    diffImage
                });
            }
        });

        vm.greenFlag();
        const startTime = Date.now();

        return Promise.resolve()
            .then(async () => {
                // waiting for all threads to complete, then we return
                while (vm.runtime.threads.some(thread => vm.runtime.isActiveThread(thread))) {
                    if ((Date.now() - startTime) >= TIMEOUT) {
                        // if we push the message after end, the failure from tap is not very useful:
                        // "not ok test after end() was called"
                        messages.unshift({
                            command: 'fail',
                            text: `Threads still running after ${TIMEOUT}ms`
                        });
                        break;
                    }

                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                return messages;
            });
    });

    // Map messages to tap reporting methods. This will be used
    // with events from scratch's runtime emitted on block instructions.
    let didPlan = false;
    let didEnd = false;
    const reporters = {
        comment (message) {
            t.comment(message);
        },
        pass (reason) {
            t.pass(reason);
        },
        fail (reason) {
            t.fail(reason);
        },
        plan (count) {
            didPlan = true;
            t.plan(Number(count));
        },
        end () {
            didEnd = true;
            t.end();
        }
    };

    // loop over each message passed back from the browser
    msgsFromBrowser.forEach((message, index) => {
        const {command, text} = message;

        // Write the diff image into the "fails" folder to allow for visual inspection
        if (command === 'fail' && 'diffImage' in message) {
            const pngData = message.diffImage.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(
                testDir('fails', `${file.replace(/\.sb3$/, '')}-${index}.png`),
                pngData,
                {encoding: 'base64'}
            );
        }

        if (reporters[command]) {
            return reporters[command](text);
        }

        // Default to a comment with the full text if we didn't match
        // any command prefix
        return reporters.comment(text);
    });

    if (!didPlan) {
        t.comment('did not say "plan NUMBER_OF_TESTS"');
    }

    // End must be called so that tap knows the test is done. If
    // the test has a SAY "end" block but that block did not
    // execute, this explicit failure will raise that issue so
    // it can be resolved.
    if (!didEnd) {
        // t.fail('did not say "end"');
        t.end();
    }
});

// immediately invoked async function to let us wait for each test to finish before starting the next.
(async () => {
    const browser = await chromium.launch({headless: false});
    const page = await browser.newPage();

    const files = fs.readdirSync(testDir())
        .filter(uri => uri.endsWith('.sb2') || uri.endsWith('.sb3'));

    for (const file of files) {
        await testFile(file, page);
    }

    // close the browser window we used
    await browser.close();
})();
