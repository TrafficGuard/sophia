Fuse built around the idea of multi-purpose and multi-layout. You can think of Fuse as a Starter kit and a guide rather than just a simple template. The purpose of Fuse is not only provide a pre-made styles for visual elements but is also be a guide to follow while building an app.

It's more of an answer to the questions like Where should I put this file? or Which file should I put this piece of code into? rather than just a compilation of example pages and ready to use styles.

Here's a simplified version of the entire directory structure of the Fuse:

public
src/
@fuse/
app/
styles/
├─
index.html
└─
main.ts
/public
Default folder for static assets like images, fonts, static styles and etc.

/src/@fuse/
This is the core directory of the Fuse. It includes components, directives, services, pipes, custom validators, animations, base styles and much more.

Modifications on this directory is NOT recommended. Since majority of changes happen within this directory on updates, any modifications to this directory and its content will make the updating process complex and time consuming.

src/app/
This directory contains all application related codes. This is where you put your code.

Fuse provides a sensible default directory structure within the app directory. You can of course completely remove everything from it and design your own structure but the provided structure is designed to handle applications from small to enterprise grade:

app/
core/
layout/
mock-api/
modules/
├─
app.component.html
├─
app.component.scss
├─
app.component.ts
├─
app.config.ts
├─
app.resolvers.ts
└─
app.routes.ts
src/app/core/
This directory is designed to contain your application's core; Singleton services, default configurations, default states and likes. It's NOT recommended to put any components, directives, pipes or simply anything has a template or related to templates in here.

Example files that can go into this directory includes, but not limited to:

Singleton services:

Auth service

Logger service

SplashScreen service

Guards

Auth guard

NoAuth guard

Defaults

Default configurations

Default state

Custom validators

Phone number validator

Confirm validator

and etc...

src/app/mock-api/
This directory is designed to contain data services for custom made MockAPI library. Detailed information about this directory and the MockAPI library can be found in the Fuse Components > Libraries > MockAPI section of this documentation.

src/app/layout/
This directory designed to contain everything related to the layout of your app. By default, Fuse provides variety of different layout options for you to use.

The LayoutComponent is an entry component and it provides an easy way of switching between different layouts. More information about how the LayoutComponent works can be found in the Customization > Theme layouts section of this documentation.

The app/layout/common/ folder includes common components for layouts such as:

Messages
Notifications
Search
Shortcuts
User Menu
These components are being used across different layouts, so if you use multiple layouts and want to create a component, directive or a pipe for using within your layouts, you can put them inside the common folder.

src/app/modules/
This directory is designed to contain your application's feature modules.

For example; Authentication related pages such as Sign In, Sign Up, Lost Password and etc. can be grouped into auth/ directory while your main admin components and modules grouped into admin/ directory.

If you use SSR (Server Side Rendering) you can even include your landing page as one of the modules and keep everything in a single app.

src/styles/
This folder contains 4 different scss files:

styles.scss

This file is for adding/importing global styles to the app.

tailwind.scss

This is the main Tailwind file for Tailwind utilities.

vendors.scss

This file is designed to import 3rd party library css/scss files into the project. Any style here can be overridden by styles.scss file allowing you to overwrite/modify 3rd party library styles and make them visually compatible with your app.

For example, let's say you use FullCalendar 3rd party library. You use the vendors.scss file to import default styles of the FullCalendar into your project so it looks and works correctly. Then, you can add custom styles to the styles.scss file to overwrite those default styles to make FullCalendar compatible with your app's design.