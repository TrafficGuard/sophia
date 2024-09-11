# Code Review

Sophia has the ability to review merge requests on GitLab with configured code review guidelines.

Some situations where you may want to use LLMs for reviewing code styles are:
- When a linting rule isn't yet available.
- When a linting rule can't easily be codified.
- When it's desired to enable a linting rule, but there is work to be done to fix the existing violations, and don't want to introduce any more violations in the meantime.

Code review guidelines are defined in the `resources/codeReview` folder as XML following the schema at `resources/codeReview/schema.xml`.

To minimise LLM costs a code review configuration can require a diff to:
- Have its filename match one of the configured file extensions.
- Have the diff include a particular string.

An example configuration is:

```xml
<code_review xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="schema.xsd">
    <description>
        Prefer returning/throwing early, and handling null/empty/exceptional cases first.
        If an else block throws, returns or only logs, then switch the ordering of the if/else blocks, which will result in not having an else block.
        The code review line number should be the line of the `if` statement.
        If there are multiple nested if/else block violations then leave a single review comment covering all violations.
    </description>
    <file_extensions>
        <include>.ts</include>
    </file_extensions>
    <requires>
        <text>else</text>
    </requires>
    <examples>
        <example>
            <code><![CDATA[
                async sendBirthdayGreeting(user: User | null): Promise<void> {
                    if (user) {
                        if(user.dateOfBirth > Date.now()) {
                            if (dayOfYear(user.dateOfBirth) === dayOfYear(Date.now())) {
                                await this.emailService.sendEmail(this.createBdayEmail(user));
                            }
                        } else {
                            throw new Error(`dateOfBirth in the future for user ${user.id}`);
                        }
                    } else {
                        throw new Error('User was null');
                    }
                }
            ]]></code>
            <review_comment><![CDATA[
                Handle exceptional cases first and exit early to simplify the code flow.
                ```
                async sendBirthdayGreeting(user: User | null): Promise<void> {
                    if (!user) throw new Error('User was null');
                    if (user.dateOfBirth < Date.now()) throw new Error(`User ${user.id} dateOfBirth is in the future.`);

                    if (dayOfYear(user.dateOfBirth) === dayOfYear(Date.now())) {
                        await this.emailService.sendEmail(this.createBdayEmail(user));
                    }
                }
                ```
            ]]></review_comment>
        </example>
        <example>
            ...
        </example>
    </examples>
</code_review>
```

## GitLab configuration

To enable the code review functionality you will need to configure webhook(s) in GitLab.

Webhooks can be configured at the project or group level, so if you have multiple top-level groups
that you wanted to be reviewed, then you will need to configure a webhook for each one.

Follow the [GitLab Webhook documentation](https://gitlab.synrgy.mobi/groups/devops/-/hooks) and for the
webhook URL enter `https://<your-sophia-domain>/gitlab/v1/webhook`

