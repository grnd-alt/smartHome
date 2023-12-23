# Use an official Node.js runtime as a parent image with Node.js version 18
FROM node:18

# Set the working directory to /app
WORKDIR /

# Copy package.json, package-lock.json, and all other files to the working directory
COPY ./ ./

# Install app dependencies
RUN npm install

# Run the build script (assuming you have a build script in your package.json)
RUN npm run build

# Expose port 80 to the outside world
EXPOSE 80

# Command to run the application
CMD ["npm", "run", "start"]
